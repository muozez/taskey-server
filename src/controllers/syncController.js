const { sequelize } = require("../config/database");
const { Op } = require("sequelize");
const { Workspace, WorkspaceClient, DiffEntry, SyncSnapshot } = require("../models/index");
const { sendSuccess, sendError } = require("../utils/response");
const { parseBody } = require("../utils/parseBody");
const log = require("../utils/logger");

/**
 * Sync Controller — Offline-First Diff Tabanlı Senkronizasyon
 *
 * ========================== SYNC STRATEJİSİ ==========================
 *
 * Taskey, offline-first mimariye sahip bir task yönetim sistemidir.
 * Lokal client'lar (SQLite) bağımsız çalışır, değişiklikleri diff olarak
 * üretir ve remote server'a (PostgreSQL) gönderir.
 *
 * ### Sync Yaşam Döngüsü
 *
 *   Faz 1 — İlk Katılım:
 *     POST /api/join → clientId + currentVersion alınır
 *     GET  /api/sync/pull (sinceVersion=0) → tam snapshot çekilir
 *     VEYA POST /api/sync/full → tam snapshot ile başlangıç durumu alınır
 *
 *   Faz 2 — Online Sync:
 *     Client değişiklik yapar → diff üretir (base_version = mevcut versiyon)
 *     POST /api/sync/push → diff'ler anında gönderilir
 *     GET  /api/sync/pull → periyodik olarak diğer client'ların değişiklikleri çekilir
 *     POST /api/sync/heartbeat → online durum bildirilir, hasPendingUpdates kontrol edilir
 *
 *   Faz 3 — Offline Modu:
 *     Client çevrimdışı çalışmaya devam eder
 *     Her değişiklik lokalde diff olarak biriktirilir
 *     base_version = son bilinen versiyon (offline başlangıcındaki)
 *     client_timestamp = lokal saat (sıralama için)
 *
 *   Faz 4 — Yeniden Bağlantı (Reconnection):
 *     1. POST /api/sync/heartbeat → currentVersion ve hasPendingUpdates öğrenilir
 *     2. POST /api/sync/push → offline biriken diff'ler toplu gönderilir
 *        - Sunucu her diff için conflict detection yapar
 *        - Workspace'in sync_strategy'sine göre çakışmalar çözülür
 *     3. GET /api/sync/pull → sunucudaki son durum çekilir
 *     4. Client, pull'dan gelen diff'leri lokale uygular
 *
 *   Faz 5 — Conflict Çözümleme:
 *     Strateji workspace bazında konfigüre edilir (sync_strategy):
 *
 *     "auto-merge" (VARSAYILAN):
 *       - Farklı entity'lere veya aynı entity'nin farklı field'larına
 *         dokunan değişiklikler otomatik birleştirilir
 *       - Aynı entity+field çakışmasında Last-Writer-Wins (client_timestamp)
 *
 *     "last-writer-wins":
 *       - Her zaman en son client_timestamp kazanır
 *       - Basit ama veri kaybı riski var
 *
 *     "server-wins":
 *       - Sunucudaki mevcut applied versiyon korunur
 *       - Client'ın çakışan diff'i rejected yapılır
 *       - En güvenli ama client değişikliği kaybolabilir
 *
 *     "manual":
 *       - Tüm çakışmalar "conflict" statüsüne alınır
 *       - Dashboard üzerinden admin tarafından çözülür
 *       - POST /api/sync/resolve veya /api/sync/resolve-batch ile çözülür
 *
 * ### Conflict Detection Algoritması
 *
 *   1. Gelen diff'in base_version'ı workspace'in current_version'ından küçükse
 *      → bu aralıkta başka değişiklik olmuş olabilir
 *   2. (base_version, current_version] aralığında status="applied" olan diff'ler taranır
 *   3. Aynı entity + entityId + field kombinasyonuna dokunan bir diff bulunursa
 *      → GERÇEK ÇAKIŞMA tespit edilir
 *   4. Field farklıysa → çakışma yok, güvenle uygulanabilir (field-level merge)
 *   5. Delete işlemi her zaman tam entity çakışması olarak değerlendirilir
 *
 * ### Diff Veri Yapısı
 *
 *   {
 *     entity: "task" | "project" | "column" | "label" | "comment",
 *     entityId: "uuid",
 *     action: "create" | "update" | "delete",
 *     field: "title" | "status" | null (create/delete için null),
 *     oldValue: any,
 *     newValue: any
 *   }
 *
 * =====================================================================
 */

// ===== POST /api/sync/push =====
// Lokal client diff'lerini sunucuya gönderir
async function push(req, res) {
  const t = await sequelize.transaction();
  try {
    const body = await parseBody(req);
    const { clientId, diffs } = body;

    if (!clientId) {
      await t.rollback();
      sendError(res, 400, "clientId gerekli");
      return;
    }
    if (!Array.isArray(diffs) || diffs.length === 0) {
      await t.rollback();
      sendError(res, 400, "En az bir diff gönderilmeli");
      return;
    }

    // Client'ı doğrula
    const client = await WorkspaceClient.findByPk(clientId, { transaction: t });
    if (!client) {
      await t.rollback();
      sendError(res, 404, "Client bulunamadı");
      return;
    }

    // Workspace'i al
    const workspace = await Workspace.findByPk(client.workspace_id, { transaction: t });
    if (!workspace) {
      await t.rollback();
      sendError(res, 404, "Workspace bulunamadı");
      return;
    }

    const strategy = workspace.sync_strategy || "auto-merge";

    // Client'ın online durumunu güncelle
    client.is_online = true;
    client.last_seen_at = new Date();
    await client.save({ transaction: t });

    // Diff'leri kaydet
    const savedDiffs = [];
    const conflicts = [];
    const autoResolved = [];

    for (const diff of diffs) {
      if (!diff.data || !diff.clientTimestamp) {
        conflicts.push({ diff, reason: "Eksik alan: data ve clientTimestamp gerekli" });
        continue;
      }

      // Diff data yapısını doğrula
      const d = diff.data;
      const validEntities = ["task", "project", "column", "label", "comment"];
      const validActions = ["create", "update", "delete"];
      if (!d.entity || !validEntities.includes(d.entity)) {
        conflicts.push({ diff, reason: `Geçersiz entity: ${d.entity}. Beklenen: ${validEntities.join(", ")}` });
        continue;
      }
      if (!d.entityId || typeof d.entityId !== "string") {
        conflicts.push({ diff, reason: "Eksik veya geçersiz entityId" });
        continue;
      }
      if (!d.action || !validActions.includes(d.action)) {
        conflicts.push({ diff, reason: `Geçersiz action: ${d.action}. Beklenen: ${validActions.join(", ")}` });
        continue;
      }

      // Conflict detection: diff'in base_version'ı workspace'in mevcut versiyonundan eski mi?
      const baseVersion = diff.baseVersion || 0;
      const hasVersionGap = baseVersion < workspace.current_version;

      let status = "pending";
      let conflictReason = null;

      if (hasVersionGap) {
        // Bu aralıkta aynı entity+field'a dokunmuş applied diff'leri bul
        const overlappingDiffs = await DiffEntry.findAll({
          where: {
            workspace_id: workspace.id,
            status: "applied",
            applied_version: { [Op.gt]: baseVersion },
          },
          order: [["applied_version", "ASC"]],
          transaction: t,
        });

        // Field-level çakışma kontrolü
        const realConflict = _detectFieldConflict(overlappingDiffs, diff.data);

        if (realConflict) {
          // Strateji bazlı çözümleme
          const resolution = _applyStrategy(strategy, diff, realConflict);

          if (resolution.action === "apply") {
            // Otomatik çözüm: client diff'i kabul ediliyor
            status = "pending";
            autoResolved.push({
              entity: diff.data.entity,
              entityId: diff.data.entityId,
              field: diff.data.field,
              strategy: resolution.reason,
            });
          } else if (resolution.action === "reject") {
            // Otomatik çözüm: client diff'i reddediliyor
            status = "rejected";
            conflictReason = resolution.reason;
          } else {
            // Manuel çözüm gerekli
            status = "conflict";
            conflictReason = `Çakışma: ${diff.data.entity}:${diff.data.entityId}` +
              (diff.data.field ? `.${diff.data.field}` : "") +
              ` v${baseVersion}→v${workspace.current_version} arasında ` +
              `client ${realConflict.client_id} tarafından değiştirilmiş`;
          }
        }
        // realConflict yoksa → farklı field'lar, field-level merge güvenli
      }

      const entry = await DiffEntry.create({
        workspace_id: workspace.id,
        client_id: clientId,
        base_version: baseVersion,
        data: diff.data,
        client_timestamp: new Date(diff.clientTimestamp),
        server_timestamp: new Date(),
        status,
        conflict_reason: conflictReason,
      }, { transaction: t });

      savedDiffs.push(entry);

      if (status === "conflict") {
        conflicts.push({
          diffId: entry.id,
          reason: conflictReason,
          data: diff.data,
          serverVersion: realConflict ? realConflict.data : null,
        });
      }
    }

    // Pending diff'leri reconcile et
    const pendingDiffs = savedDiffs.filter((d) => d.status === "pending");

    if (pendingDiffs.length > 0) {
      await _reconcile(workspace, pendingDiffs, t);
    }

    await t.commit();

    log.info("Push tamamlandı", {
      clientId,
      workspace: workspace.id,
      accepted: pendingDiffs.length,
      rejected: savedDiffs.filter((d) => d.status === "rejected").length,
      conflicts: conflicts.length,
      autoResolved: autoResolved.length,
      version: workspace.current_version,
    });

    sendSuccess(res, {
      accepted: pendingDiffs.length,
      rejected: savedDiffs.filter((d) => d.status === "rejected").length,
      conflicts: conflicts.length,
      autoResolved: autoResolved.length,
      autoResolvedDetails: autoResolved,
      conflictDetails: conflicts,
      currentVersion: workspace.current_version,
      strategy,
    });
  } catch (err) {
    await t.rollback();
    log.error("Push hatası", { err });
    sendError(res, 500, "Push işlemi sırasında bir hata oluştu");
  }
}

// ===== GET /api/sync/pull?clientId=X&sinceVersion=N =====
// Client son versiyondan bu yana olan değişiklikleri çeker
async function pull(req, res) {
  try {
    const url = new URL(req.url, "http://localhost");
    const clientId = url.searchParams.get("clientId");
    const sinceVersion = parseInt(url.searchParams.get("sinceVersion") || "0", 10);

    if (!clientId) {
      sendError(res, 400, "clientId gerekli");
      return;
    }

    const client = await WorkspaceClient.findByPk(clientId);
    if (!client) {
      sendError(res, 404, "Client bulunamadı");
      return;
    }

    const workspace = await Workspace.findByPk(client.workspace_id);
    if (!workspace) {
      sendError(res, 404, "Workspace bulunamadı");
      return;
    }

    // Client'ın bildiği son versiyon
    const fromVersion = sinceVersion || client.last_synced_version;

    // Eğer client zaten güncel ise
    if (fromVersion >= workspace.current_version) {
      sendSuccess(res, {
        upToDate: true,
        currentVersion: workspace.current_version,
        diffs: [],
        snapshot: null,
      });
      return;
    }

    // Bu versiyon aralığındaki applied diff'leri getir (diğer client'lardan gelen)
    const appliedDiffs = await DiffEntry.findAll({
      where: {
        workspace_id: workspace.id,
        status: "applied",
        applied_version: { [Op.gt]: fromVersion },
        client_id: { [Op.ne]: clientId }, // Kendi diff'lerini hariç tut
      },
      order: [["applied_version", "ASC"], ["server_timestamp", "ASC"]],
    });

    // En son snapshot'ı getir
    const latestSnapshot = await SyncSnapshot.findOne({
      where: { workspace_id: workspace.id },
      order: [["version", "DESC"]],
    });

    // Client'ın bekleyen conflict'leri
    const pendingConflicts = await DiffEntry.findAll({
      where: {
        workspace_id: workspace.id,
        client_id: clientId,
        status: "conflict",
      },
      order: [["server_timestamp", "ASC"]],
    });

    // Client'ın last_synced_version'ı güncelle
    client.last_synced_version = workspace.current_version;
    client.last_seen_at = new Date();
    client.is_online = true;
    await client.save();

    sendSuccess(res, {
      upToDate: false,
      currentVersion: workspace.current_version,
      fromVersion,
      syncStrategy: workspace.sync_strategy,
      diffs: appliedDiffs.map((d) => ({
        id: d.id,
        data: d.data,
        appliedVersion: d.applied_version,
        clientTimestamp: d.client_timestamp,
        serverTimestamp: d.server_timestamp,
      })),
      snapshot: latestSnapshot
        ? {
            version: latestSnapshot.version,
            data: latestSnapshot.data,
            createdAt: latestSnapshot.created_at || latestSnapshot.createdAt,
          }
        : null,
      pendingConflicts: pendingConflicts.map((c) => ({
        diffId: c.id,
        data: c.data,
        reason: c.conflict_reason,
        clientTimestamp: c.client_timestamp,
      })),
    });
  } catch (err) {
    log.error("Pull hatası", { err });
    sendError(res, 500, "Pull işlemi sırasında bir hata oluştu");
  }
}

// ===== POST /api/sync/full =====
// Tam snapshot ile senkronizasyon (ilk katılım veya uzun offline sonrası)
async function fullSync(req, res) {
  try {
    const body = await parseBody(req);
    const { clientId } = body;

    if (!clientId) {
      sendError(res, 400, "clientId gerekli");
      return;
    }

    const client = await WorkspaceClient.findByPk(clientId);
    if (!client) {
      sendError(res, 404, "Client bulunamadı");
      return;
    }

    const workspace = await Workspace.findByPk(client.workspace_id);
    if (!workspace) {
      sendError(res, 404, "Workspace bulunamadı");
      return;
    }

    // En son snapshot'ı al
    const latestSnapshot = await SyncSnapshot.findOne({
      where: { workspace_id: workspace.id },
      order: [["version", "DESC"]],
    });

    // Client'ın conflict durumundaki diff'leri
    const pendingConflicts = await DiffEntry.findAll({
      where: {
        workspace_id: workspace.id,
        client_id: clientId,
        status: "conflict",
      },
      order: [["server_timestamp", "ASC"]],
    });

    // Client durumunu güncelle
    client.last_synced_version = workspace.current_version;
    client.last_seen_at = new Date();
    client.is_online = true;
    await client.save();

    sendSuccess(res, {
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      currentVersion: workspace.current_version,
      syncStrategy: workspace.sync_strategy,
      snapshot: latestSnapshot
        ? {
            version: latestSnapshot.version,
            data: latestSnapshot.data,
            appliedDiffIds: latestSnapshot.applied_diff_ids,
            createdAt: latestSnapshot.created_at || latestSnapshot.createdAt,
          }
        : { version: 0, data: {}, appliedDiffIds: [], createdAt: null },
      pendingConflicts: pendingConflicts.map((c) => ({
        diffId: c.id,
        data: c.data,
        reason: c.conflict_reason,
        clientTimestamp: c.client_timestamp,
      })),
    });
  } catch (err) {
    log.error("Full sync hatası", { err });
    sendError(res, 500, "Full sync işlemi sırasında bir hata oluştu");
  }
}

// ===== POST /api/sync/heartbeat =====
// Client online durumunu bildirir
async function heartbeat(req, res) {
  try {
    const body = await parseBody(req);
    const { clientId } = body;

    if (!clientId) {
      sendError(res, 400, "clientId gerekli");
      return;
    }

    const client = await WorkspaceClient.findByPk(clientId);
    if (!client) {
      sendError(res, 404, "Client bulunamadı");
      return;
    }

    client.is_online = true;
    client.last_seen_at = new Date();
    await client.save();

    const workspace = await Workspace.findByPk(client.workspace_id);

    // Bekleyen conflict sayısı
    const conflictCount = await DiffEntry.count({
      where: {
        workspace_id: client.workspace_id,
        client_id: clientId,
        status: "conflict",
      },
    });

    sendSuccess(res, {
      currentVersion: workspace ? workspace.current_version : 0,
      lastSyncedVersion: client.last_synced_version,
      hasPendingUpdates: workspace
        ? client.last_synced_version < workspace.current_version
        : false,
      pendingConflicts: conflictCount,
      syncStrategy: workspace ? workspace.sync_strategy : "auto-merge",
    });
  } catch (err) {
    log.error("Heartbeat hatası", { err });
    sendError(res, 500, "Heartbeat işlemi sırasında bir hata oluştu");
  }
}

// ===== GET /api/sync/status?workspaceId=X =====
// Workspace senkronizasyon durumu (dashboard için)
async function status(req, res) {
  try {
    const url = new URL(req.url, "http://localhost");
    const workspaceId = url.searchParams.get("workspaceId");

    if (!workspaceId) {
      sendError(res, 400, "workspaceId gerekli");
      return;
    }

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace) {
      sendError(res, 404, "Workspace bulunamadı");
      return;
    }

    const clients = await WorkspaceClient.findAll({
      where: { workspace_id: workspaceId },
    });

    const pendingDiffs = await DiffEntry.count({
      where: { workspace_id: workspaceId, status: "pending" },
    });
    const conflictDiffs = await DiffEntry.count({
      where: { workspace_id: workspaceId, status: "conflict" },
    });
    const rejectedDiffs = await DiffEntry.count({
      where: { workspace_id: workspaceId, status: "rejected" },
    });
    const totalDiffs = await DiffEntry.count({
      where: { workspace_id: workspaceId },
    });
    const appliedDiffs = await DiffEntry.count({
      where: { workspace_id: workspaceId, status: "applied" },
    });

    sendSuccess(res, {
      workspaceId,
      currentVersion: workspace.current_version,
      syncStrategy: workspace.sync_strategy,
      totalDiffs,
      appliedDiffs,
      pendingDiffs,
      conflictDiffs,
      rejectedDiffs,
      clients: clients.map((c) => ({
        clientId: c.id,
        name: c.client_name,
        hostname: c.hostname,
        isOnline: c.is_online,
        lastSyncedVersion: c.last_synced_version,
        lastSeenAt: c.last_seen_at,
        behindVersions: workspace.current_version - c.last_synced_version,
      })),
    });
  } catch (err) {
    log.error("Durum sorgulama hatası", { err });
    sendError(res, 500, "Durum sorgulama sırasında bir hata oluştu");
  }
}

// ===== GET /api/sync/conflicts?workspaceId=X =====
// Workspace'teki tüm conflict'leri listele (dashboard için)
async function conflicts(req, res) {
  try {
    const url = new URL(req.url, "http://localhost");
    const workspaceId = url.searchParams.get("workspaceId");

    if (!workspaceId) {
      sendError(res, 400, "workspaceId gerekli");
      return;
    }

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace) {
      sendError(res, 404, "Workspace bulunamadı");
      return;
    }

    const conflictDiffs = await DiffEntry.findAll({
      where: {
        workspace_id: workspaceId,
        status: "conflict",
      },
      order: [["server_timestamp", "DESC"]],
      include: [
        { model: WorkspaceClient, as: "client", attributes: ["id", "client_name", "hostname"] },
      ],
    });

    // Her conflict için sunucudaki mevcut durumu da getir
    const conflictsWithContext = await Promise.all(
      conflictDiffs.map(async (diff) => {
        // Aynı entity+id için en son applied diff'i bul (sunucudaki durum)
        const serverDiff = await DiffEntry.findOne({
          where: {
            workspace_id: workspaceId,
            status: "applied",
            applied_version: { [Op.gt]: diff.base_version },
          },
          order: [["applied_version", "DESC"]],
        });

        // Sunucudaki mevcut entity durumunu snapshot'tan al
        let serverCurrentValue = null;
        const latestSnapshot = await SyncSnapshot.findOne({
          where: { workspace_id: workspaceId },
          order: [["version", "DESC"]],
        });
        if (latestSnapshot && diff.data.entity && diff.data.entityId) {
          const entityStore = latestSnapshot.data[diff.data.entity];
          if (entityStore) {
            serverCurrentValue = entityStore[diff.data.entityId] || null;
          }
        }

        return {
          diffId: diff.id,
          clientId: diff.client_id,
          clientName: diff.client ? diff.client.client_name : null,
          baseVersion: diff.base_version,
          data: diff.data,
          clientTimestamp: diff.client_timestamp,
          serverTimestamp: diff.server_timestamp,
          conflictReason: diff.conflict_reason,
          serverCurrentValue,
          lastServerDiff: serverDiff ? {
            diffId: serverDiff.id,
            data: serverDiff.data,
            appliedVersion: serverDiff.applied_version,
          } : null,
        };
      })
    );

    sendSuccess(res, {
      workspaceId,
      currentVersion: workspace.current_version,
      totalConflicts: conflictsWithContext.length,
      conflicts: conflictsWithContext,
    });
  } catch (err) {
    log.error("Conflict listesi hatası", { err });
    sendError(res, 500, "Conflict listesi alınırken bir hata oluştu");
  }
}
// Conflict olan diff'leri manuel çöz
async function resolve(req, res) {
  try {
    const body = await parseBody(req);
    const { diffId, resolution } = body;
    // resolution: "accept" | "reject"

    if (!diffId || !resolution) {
      sendError(res, 400, "diffId ve resolution (accept|reject) gerekli");
      return;
    }

    if (!["accept", "reject"].includes(resolution)) {
      sendError(res, 400, "resolution 'accept' veya 'reject' olmalı");
      return;
    }

    const diff = await DiffEntry.findByPk(diffId);
    if (!diff) {
      sendError(res, 404, "Diff bulunamadı");
      return;
    }
    if (diff.status !== "conflict") {
      sendError(res, 400, "Bu diff conflict durumunda değil");
      return;
    }

    const t = await sequelize.transaction();
    try {
      if (resolution === "accept") {
        const workspace = await Workspace.findByPk(diff.workspace_id, { transaction: t });
        diff.status = "pending";
        await diff.save({ transaction: t });
        await _reconcile(workspace, [diff], t);
      } else {
        diff.status = "rejected";
        await diff.save({ transaction: t });
      }
      await t.commit();

      sendSuccess(res, {
        diffId,
        resolution,
        message: `Diff ${resolution === "accept" ? "uygulandı" : "reddedildi"}`,
      });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  } catch (err) {
    log.error("Çözümleme hatası", { err });
    sendError(res, 500, "Çözümleme sırasında bir hata oluştu");
  }
}
// Birden fazla conflict'i toplu çöz
async function resolveBatch(req, res) {
  const t = await sequelize.transaction();
  try {
    const body = await parseBody(req);
    const { resolutions } = body;
    // resolutions: [{ diffId, resolution: "accept"|"reject" }, ...]

    if (!Array.isArray(resolutions) || resolutions.length === 0) {
      await t.rollback();
      sendError(res, 400, "resolutions dizisi gerekli");
      return;
    }

    const results = [];
    const toReconcile = {};

    for (const r of resolutions) {
      if (!r.diffId || !r.resolution || !["accept", "reject"].includes(r.resolution)) {
        results.push({ diffId: r.diffId, success: false, reason: "Geçersiz format" });
        continue;
      }

      const diff = await DiffEntry.findByPk(r.diffId, { transaction: t });
      if (!diff) {
        results.push({ diffId: r.diffId, success: false, reason: "Diff bulunamadı" });
        continue;
      }
      if (diff.status !== "conflict") {
        results.push({ diffId: r.diffId, success: false, reason: "Conflict durumunda değil" });
        continue;
      }

      if (r.resolution === "accept") {
        diff.status = "pending";
        await diff.save({ transaction: t });

        if (!toReconcile[diff.workspace_id]) {
          toReconcile[diff.workspace_id] = [];
        }
        toReconcile[diff.workspace_id].push(diff);
        results.push({ diffId: r.diffId, success: true, resolution: "accepted" });
      } else {
        diff.status = "rejected";
        await diff.save({ transaction: t });
        results.push({ diffId: r.diffId, success: true, resolution: "rejected" });
      }
    }

    // Kabul edilen diff'leri workspace bazında reconcile et
    for (const [workspaceId, diffs] of Object.entries(toReconcile)) {
      const workspace = await Workspace.findByPk(workspaceId, { transaction: t });
      if (workspace) {
        await _reconcile(workspace, diffs, t);
      }
    }

    await t.commit();

    sendSuccess(res, {
      total: resolutions.length,
      results,
    });
  } catch (err) {
    await t.rollback();
    log.error("Toplu çözümleme hatası", { err });
    sendError(res, 500, "Toplu çözümleme sırasında bir hata oluştu");
  }
}
// Workspace'in sync stratejisini güncelle (dashboard için)
async function updateStrategy(req, res) {
  try {
    const body = await parseBody(req);
    const { workspaceId, strategy } = body;

    if (!workspaceId || !strategy) {
      sendError(res, 400, "workspaceId ve strategy gerekli");
      return;
    }

    const validStrategies = ["auto-merge", "last-writer-wins", "server-wins", "manual"];
    if (!validStrategies.includes(strategy)) {
      sendError(res, 400, `Geçersiz strateji. Seçenekler: ${validStrategies.join(", ")}`);
      return;
    }

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace) {
      sendError(res, 404, "Workspace bulunamadı");
      return;
    }

    workspace.sync_strategy = strategy;
    await workspace.save();

    sendSuccess(res, {
      workspaceId,
      strategy: workspace.sync_strategy,
      message: `Sync stratejisi '${strategy}' olarak güncellendi`,
    });
  } catch (err) {
    log.error("Strateji güncelleme hatası", { err });
    sendError(res, 500, "Strateji güncelleme sırasında bir hata oluştu");
  }
}
// ================= INTERNAL HELPER FUNCTIONS ========================
// ===================================================================

/**
 * Field-level çakışma tespiti
 *
 * Gelen diff ile aynı entity+entityId+field'a dokunan
 * applied diff var mı kontrol eder.
 *
 * @param {Array} overlappingDiffs - base_version sonrası applied diff'ler
 * @param {Object} incomingData - Gelen diff'in data'sı
 * @returns {Object|null} Çakışan diff veya null
 */
function _detectFieldConflict(overlappingDiffs, incomingData) {
  for (const existing of overlappingDiffs) {
    const existingData = existing.data;

    // Aynı entity + entityId mi?
    if (existingData.entity !== incomingData.entity) continue;
    if (existingData.entityId !== incomingData.entityId) continue;

    // Delete her zaman tam çakışma
    if (incomingData.action === "delete" || existingData.action === "delete") {
      return existing;
    }

    // Create + Create → aynı entityId ile iki create (nadir ama olabilir)
    if (incomingData.action === "create" && existingData.action === "create") {
      return existing;
    }

    // Update + Update → aynı field ise çakışma
    if (incomingData.field && existingData.field) {
      if (incomingData.field === existingData.field) {
        return existing;
      }
      // Farklı field → çakışma yok (field-level merge)
      continue;
    }

    // Tam obje güncellemesi (field=null) → çakışma
    if (!incomingData.field || !existingData.field) {
      return existing;
    }
  }

  return null;
}

/**
 * Strateji bazlı çakışma çözümleme
 *
 * @param {string} strategy - Workspace'in sync_strategy'si
 * @param {Object} incomingDiff - Gelen diff ({ data, clientTimestamp, ... })
 * @param {Object} existingDiff - Sunucudaki çakışan diff (DiffEntry instance)
 * @returns {{ action: "apply"|"reject"|"conflict", reason: string }}
 */
function _applyStrategy(strategy, incomingDiff, existingDiff) {
  switch (strategy) {
    case "last-writer-wins": {
      const incomingTime = new Date(incomingDiff.clientTimestamp).getTime();
      const existingTime = new Date(existingDiff.client_timestamp).getTime();

      if (incomingTime >= existingTime) {
        return {
          action: "apply",
          reason: `LWW: client timestamp (${incomingDiff.clientTimestamp}) daha yeni`,
        };
      }
      return {
        action: "reject",
        reason: `LWW: sunucu timestamp (${existingDiff.client_timestamp}) daha yeni`,
      };
    }

    case "server-wins":
      return {
        action: "reject",
        reason: "server-wins: sunucudaki mevcut versiyon korundu",
      };

    case "manual":
      return {
        action: "conflict",
        reason: "manual: çakışma dashboard'dan çözülecek",
      };

    case "auto-merge":
    default: {
      // Auto-merge: field-level merge zaten _detectFieldConflict'te yapılıyor.
      // Buraya geldiysek gerçek çakışma var (aynı field).
      // Fallback: Last-Writer-Wins by timestamp
      const incomingTime = new Date(incomingDiff.clientTimestamp).getTime();
      const existingTime = new Date(existingDiff.client_timestamp).getTime();

      if (incomingTime >= existingTime) {
        return {
          action: "apply",
          reason: `auto-merge/LWW: aynı field çakışması, client timestamp daha yeni`,
        };
      }
      return {
        action: "reject",
        reason: `auto-merge/LWW: aynı field çakışması, sunucu timestamp daha yeni`,
      };
    }
  }
}

// ===== Internal: Reconcile pending diffs =====
async function _reconcile(workspace, diffs, transaction) {
  if (!diffs.length) return;

  // Versiyon artır
  workspace.current_version += 1;
  await workspace.save({ transaction });

  // Diff'lere applied_version yaz
  for (const diff of diffs) {
    diff.applied_version = workspace.current_version;
    diff.status = "applied";
    await diff.save({ transaction });
  }

  // Son snapshot'ı al (varsa), üzerine diff'leri uygula
  let snapshotData = {};
  const lastSnapshot = await SyncSnapshot.findOne({
    where: { workspace_id: workspace.id },
    order: [["version", "DESC"]],
    transaction,
  });

  if (lastSnapshot) {
    // structuredClone kullanarak verimli derin kopyalama
    snapshotData = structuredClone(lastSnapshot.data);
  }

  // Her diff'i snapshot'a uygula
  for (const diff of diffs) {
    const d = diff.data;
    const entityType = d.entity; // "task", "project", vb.
    const entityId = d.entityId;

    if (!snapshotData[entityType]) {
      snapshotData[entityType] = {};
    }

    switch (d.action) {
      case "create":
        snapshotData[entityType][entityId] = d.newValue;
        break;
      case "update":
        if (!snapshotData[entityType][entityId]) {
          snapshotData[entityType][entityId] = {};
        }
        if (d.field) {
          snapshotData[entityType][entityId][d.field] = d.newValue;
        } else {
          // Tam obje güncellemesi
          snapshotData[entityType][entityId] = {
            ...snapshotData[entityType][entityId],
            ...d.newValue,
          };
        }
        break;
      case "delete":
        delete snapshotData[entityType][entityId];
        break;
    }
  }

  // Yeni snapshot oluştur
  await SyncSnapshot.create({
    workspace_id: workspace.id,
    version: workspace.current_version,
    data: snapshotData,
    applied_diff_ids: diffs.map((d) => d.id),
    summary: `${diffs.length} diff uygulandı (v${workspace.current_version})`,
  }, { transaction });
}

module.exports = {
  push,
  pull,
  fullSync,
  heartbeat,
  status,
  conflicts,
  resolve,
  resolveBatch,
  updateStrategy,
};
