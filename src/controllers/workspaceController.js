const { Workspace, WorkspaceClient } = require("../models/index");
const { sendSuccess, sendError } = require("../utils/response");
const { parseBody } = require("../utils/parseBody");
const { isValidKeyFormat, generateJoinKey } = require("../utils/keyGenerator");

/**
 * Workspace Controller — PostgreSQL (Sequelize ORM) ile çalışır
 */

// ===== Helper: Workspace → API response formatı =====
function formatWorkspace(ws, clients) {
  const statusTextMap = { online: "Çevrimiçi", offline: "Çevrimdışı", pending: "Beklemede" };
  return {
    id: ws.id,
    name: ws.name,
    abbr: ws.abbr,
    color: ws.color,
    status: ws.status,
    statusText: statusTextMap[ws.status] || ws.status,
    metric: "CPU Kullanımı",
    usage: 0,
    members: clients ? clients.length : 0,
    avatarColors: ["#a5b4fc", "#86efac", "#fbbf24"].slice(0, Math.min(clients ? clients.length : 1, 3)),
    server: ws.server || "",
    description: ws.description || "",
    joinKey: ws.join_key,
    currentVersion: ws.current_version,
    createdAt: ws.created_at || ws.createdAt,
    connectedClients: clients
      ? clients.map((c) => ({
          clientId: c.id,
          name: c.client_name,
          hostname: c.hostname,
          isOnline: c.is_online,
          lastSyncedVersion: c.last_synced_version,
          lastSeenAt: c.last_seen_at,
          joinedAt: c.created_at || c.createdAt,
        }))
      : [],
  };
}

// GET /api/workspaces — Tüm workspace'leri listele
async function list(req, res) {
  try {
    const workspaces = await Workspace.findAll({
      include: [{ model: WorkspaceClient, as: "clients" }],
      order: [["created_at", "DESC"]],
    });
    const formatted = workspaces.map((ws) => formatWorkspace(ws, ws.clients));
    sendSuccess(res, { workspaces: formatted });
  } catch (err) {
    sendError(res, 500, "Workspace listesi alınamadı: " + err.message);
  }
}

// GET /api/workspaces/:id — Tek workspace detayı
async function getById(req, res, id) {
  try {
    const ws = await Workspace.findByPk(id, {
      include: [{ model: WorkspaceClient, as: "clients" }],
    });
    if (!ws) {
      sendError(res, 404, "Çalışma alanı bulunamadı");
      return;
    }
    sendSuccess(res, { workspace: formatWorkspace(ws, ws.clients) });
  } catch (err) {
    sendError(res, 500, "Detay alınamadı: " + err.message);
  }
}

// POST /api/workspaces — Yeni workspace oluştur
async function create(req, res) {
  try {
    const body = await parseBody(req);
    const { name, server, description } = body;

    if (!name || !name.trim()) {
      sendError(res, 400, "Çalışma alanı adı gerekli");
      return;
    }
    if (!server || !server.trim()) {
      sendError(res, 400, "Sunucu seçimi gerekli");
      return;
    }

    const trimmedName = name.trim();
    const abbr = trimmedName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
    const colors = ["indigo", "amber", "rose", "green", "blue"];
    const wsCount = await Workspace.count();

    const ws = await Workspace.create({
      name: trimmedName,
      abbr,
      color: colors[wsCount % colors.length],
      status: "pending",
      server: server.trim(),
      description: (description || "").trim(),
      join_key: generateJoinKey(),
      owner_id: req.user ? (await _findUserIdByEmail(req.user.email)) : null,
    });

    sendSuccess(res, { workspace: formatWorkspace(ws, []) }, 201);
  } catch (err) {
    sendError(res, 400, "Oluşturma hatası: " + err.message);
  }
}

// DELETE /api/workspaces/:id — Workspace sil
async function remove(req, res, id) {
  try {
    const deleted = await Workspace.destroy({ where: { id } });
    if (!deleted) {
      sendError(res, 404, "Çalışma alanı bulunamadı");
      return;
    }
    sendSuccess(res, { message: "Çalışma alanı silindi" });
  } catch (err) {
    sendError(res, 500, "Silme hatası: " + err.message);
  }
}

// POST /api/workspaces/:id/regenerate-key — Join key yenile
async function regenerateKey(req, res, id) {
  try {
    const ws = await Workspace.findByPk(id);
    if (!ws) {
      sendError(res, 404, "Çalışma alanı bulunamadı");
      return;
    }
    ws.join_key = generateJoinKey();
    await ws.save();

    const clients = await WorkspaceClient.findAll({ where: { workspace_id: id } });
    sendSuccess(res, { workspace: formatWorkspace(ws, clients) });
  } catch (err) {
    sendError(res, 500, "Key yenileme hatası: " + err.message);
  }
}

// POST /api/join — Lokal client join key ile bağlanır (PUBLIC endpoint)
async function join(req, res) {
  try {
    const body = await parseBody(req);
    const { joinKey, clientName, hostname } = body;

    if (!joinKey) {
      sendError(res, 400, "Katılım anahtarı gerekli");
      return;
    }
    if (!isValidKeyFormat(joinKey)) {
      sendError(res, 400, "Geçersiz anahtar formatı. Beklenen: XXXX-YYYY");
      return;
    }

    const ws = await Workspace.findOne({ where: { join_key: joinKey.toUpperCase() } });
    if (!ws) {
      sendError(res, 404, "Bu anahtarla eşleşen çalışma alanı bulunamadı");
      return;
    }

    // Upsert: aynı hostname tekrar katılırsa güncelle
    const [client, created] = await WorkspaceClient.findOrCreate({
      where: { workspace_id: ws.id, hostname: hostname || "unknown" },
      defaults: {
        workspace_id: ws.id,
        client_name: clientName || "Anonim",
        hostname: hostname || "unknown",
        is_online: true,
        last_seen_at: new Date(),
      },
    });

    if (!created) {
      client.client_name = clientName || client.client_name;
      client.is_online = true;
      client.last_seen_at = new Date();
      await client.save();
    }

    sendSuccess(res, {
      message: "Çalışma alanına başarıyla katıldınız",
      workspace: {
        id: ws.id,
        name: ws.name,
        status: ws.status,
        currentVersion: ws.current_version,
      },
      client: {
        clientId: client.id,
        name: client.client_name,
        hostname: client.hostname,
        lastSyncedVersion: client.last_synced_version,
      },
    });
  } catch (err) {
    sendError(res, 400, "Katılım hatası: " + err.message);
  }
}

// POST /api/validate-key — Key doğrulama (bağlanmadan kontrol)
async function validateKey(req, res) {
  try {
    const body = await parseBody(req);
    const { joinKey } = body;

    if (!joinKey || !isValidKeyFormat(joinKey)) {
      sendSuccess(res, { valid: false, message: "Geçersiz anahtar formatı" });
      return;
    }

    const ws = await Workspace.findOne({ where: { join_key: joinKey.toUpperCase() } });
    if (!ws) {
      sendSuccess(res, { valid: false, message: "Anahtar ile eşleşen alan bulunamadı" });
      return;
    }

    sendSuccess(res, {
      valid: true,
      workspace: { id: ws.id, name: ws.name, status: ws.status },
    });
  } catch (err) {
    sendError(res, 400, "Doğrulama hatası: " + err.message);
  }
}

// Helper: email'den user id bul
async function _findUserIdByEmail(email) {
  const { User } = require("../models/index");
  const user = await User.findOne({ where: { email } });
  return user ? user.id : null;
}

// GET /api/stats — Dashboard istatistikleri
async function stats(req, res) {
  try {
    const { Workspace, WorkspaceClient } = require("../models/index");
    const { Op } = require("sequelize");

    const totalWorkspaces = await Workspace.count();
    const onlineWorkspaces = await Workspace.count({ where: { status: "online" } });
    const totalClients = await WorkspaceClient.count();
    const onlineClients = await WorkspaceClient.count({ where: { is_online: true } });

    // Bu hafta oluşturulan workspace sayısı
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const newThisWeek = await Workspace.count({
      where: { created_at: { [Op.gte]: oneWeekAgo } },
    });

    // Benzersiz sunucu sayısı
    const servers = await Workspace.findAll({
      attributes: ["server"],
      group: ["server"],
      where: { server: { [Op.ne]: null, [Op.ne]: "" } },
    });

    sendSuccess(res, {
      stats: {
        totalWorkspaces,
        onlineWorkspaces,
        totalClients,
        onlineClients,
        newThisWeek,
        uniqueServers: servers.length,
      },
    });
  } catch (err) {
    sendError(res, 500, "İstatistik alınamadı: " + err.message);
  }
}

module.exports = {
  list,
  getById,
  create,
  remove,
  regenerateKey,
  join,
  validateKey,
  stats,
};
