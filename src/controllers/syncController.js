const { sequelize } = require("../config/database");
const { Workspace, WorkspaceClient, DiffEntry, SyncSnapshot } = require("../models/index");
const { sendSuccess, sendError } = require("../utils/response");
const { parseBody } = require("../utils/parseBody");

/**
 * Sync Controller — Diff tabanlı senkronizasyon
 *
 * Akış:
 *   1. Lokal client (SQLite) değişiklik yapar → diff üretir
 *   2. POST /api/sync/push → Diff'ler sunucuya gönderilir
 *   3. Sunucu diff'leri kaydeder, reconcile yapar
 *   4. GET /api/sync/pull?clientId=X → Client son versiyonu çeker
 *   5. POST /api/sync/heartbeat → Client online durumunu bildirir
 *
 *   Offline tolerans: Client offline iken biriktirdiği diff'leri
 *   tekrar online olduğunda toplu push yapar. base_version ile
 *   conflict detection yapılır.
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

    // Client'ın online durumunu güncelle
    client.is_online = true;
    client.last_seen_at = new Date();
    await client.save({ transaction: t });

    // Diff'leri kaydet
    const savedDiffs = [];
    const conflicts = [];

    for (const diff of diffs) {
      if (!diff.data || !diff.clientTimestamp) {
        conflicts.push({ diff, reason: "Eksik alan: data ve clientTimestamp gerekli" });
        continue;
      }

      // Conflict detection: diff'in base_version'ı workspace'in mevcut versiyonundan eski mi?
      const baseVersion = diff.baseVersion || 0;
      const hasConflict = baseVersion < workspace.current_version;

      let status = "pending";
      let conflictReason = null;

      if (hasConflict) {
        // Aynı entity + field'a dokunmuş başka applied diff var mı kontrol et
        const overlapping = await DiffEntry.findOne({
          where: {
            workspace_id: workspace.id,
            status: "applied",
            applied_version: { [require("sequelize").Op.gt]: baseVersion },
          },
          transaction: t,
        });

        if (overlapping) {
          // Aynı entity üzerindeki gerçek çakışma kontrolü
          const overlappingData = overlapping.data;
          if (
            overlappingData.entity === diff.data.entity &&
            overlappingData.entityId === diff.data.entityId &&
            (overlappingData.field === diff.data.field || diff.data.action === "delete")
          ) {
            status = "conflict";
            conflictReason = `Aynı kayıt (${diff.data.entity}:${diff.data.entityId}) v${baseVersion} ile v${workspace.current_version} arasında başka bir node tarafından değiştirilmiş`;
          }
        }
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
        });
      }
    }

    // Pending diff'leri reconcile et
    const pendingDiffs = savedDiffs.filter((d) => d.status === "pending");

    if (pendingDiffs.length > 0) {
      await _reconcile(workspace, pendingDiffs, t);
    }

    await t.commit();

    sendSuccess(res, {
      accepted: pendingDiffs.length,
      conflicts: conflicts.length,
      conflictDetails: conflicts,
      currentVersion: workspace.current_version,
    });
  } catch (err) {
    await t.rollback();
    sendError(res, 500, "Push hatası: " + err.message);
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
        applied_version: { [require("sequelize").Op.gt]: fromVersion },
        client_id: { [require("sequelize").Op.ne]: clientId }, // Kendi diff'lerini hariç tut
      },
      order: [["applied_version", "ASC"], ["server_timestamp", "ASC"]],
    });

    // En son snapshot'ı getir
    const latestSnapshot = await SyncSnapshot.findOne({
      where: { workspace_id: workspace.id },
      order: [["version", "DESC"]],
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
    });
  } catch (err) {
    sendError(res, 500, "Pull hatası: " + err.message);
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

    sendSuccess(res, {
      currentVersion: workspace ? workspace.current_version : 0,
      lastSyncedVersion: client.last_synced_version,
      hasPendingUpdates: workspace
        ? client.last_synced_version < workspace.current_version
        : false,
    });
  } catch (err) {
    sendError(res, 500, "Heartbeat hatası: " + err.message);
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
    const totalDiffs = await DiffEntry.count({
      where: { workspace_id: workspaceId },
    });

    sendSuccess(res, {
      workspaceId,
      currentVersion: workspace.current_version,
      totalDiffs,
      pendingDiffs,
      conflictDiffs,
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
    sendError(res, 500, "Durum sorgulama hatası: " + err.message);
  }
}

// ===== POST /api/sync/resolve =====
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
        await _reconcile(workspace, [diff], t);
        diff.status = "applied";
      } else {
        diff.status = "rejected";
      }
      await diff.save({ transaction: t });
      await t.commit();

      sendSuccess(res, { message: `Diff ${resolution === "accept" ? "uygulandı" : "reddedildi"}` });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  } catch (err) {
    sendError(res, 500, "Çözümleme hatası: " + err.message);
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
    snapshotData = JSON.parse(JSON.stringify(lastSnapshot.data));
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
    summary: `${diffs.length} diff uygulandı`,
  }, { transaction });
}

module.exports = {
  push,
  pull,
  heartbeat,
  status,
  resolve,
};
