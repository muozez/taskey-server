const { Workspace, WorkspaceClient } = require("../models/index");
const { sendSuccess, sendError } = require("../utils/response");
const { parseBody } = require("../utils/parseBody");
const { isValidKeyFormat, generateJoinKey } = require("../utils/keyGenerator");
const { logActivity } = require("../utils/activityLogger");
const log = require("../utils/logger");

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
    log.error("Workspace listesi hatası", { err });
    sendError(res, 500, "Workspace listesi alınamadı");
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
    log.error("Workspace detay hatası", { id, err });
    sendError(res, 500, "Detay alınamadı");
  }
}

// POST /api/workspaces — Yeni workspace oluştur
async function create(req, res) {
  try {
    const body = await parseBody(req);
    const { name, description } = body;

    if (!name || !name.trim()) {
      sendError(res, 400, "Çalışma alanı adı gerekli");
      return;
    }

    const trimmedName = name.trim();
    let abbr = trimmedName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
    // Kısaltma 2 karakterden kısaysa, ismin ilk 2 karakterini kullan
    if (abbr.length < 2) {
      abbr = trimmedName.toUpperCase().slice(0, 2).padEnd(2, "X");
    }
    const colors = ["indigo", "amber", "rose", "green", "blue"];
    const wsCount = await Workspace.count();

    const ws = await Workspace.create({
      name: trimmedName,
      abbr,
      color: colors[wsCount % colors.length],
      status: "pending",
      server: "Docker",
      description: (description || "").trim(),
      join_key: generateJoinKey(),
      owner_id: req.user ? (await _findUserIdByEmail(req.user.email)) : null,
    });

    const actorName = req.user ? req.user.name : "Sistem";
    await logActivity("workspace_created", `"${trimmedName}" çalışma alanı oluşturuldu`, `${actorName} yeni bir çalışma alanı oluşturdu.`, actorName, { workspaceId: ws.id, workspaceName: trimmedName });

    log.info("Workspace oluşturuldu", { id: ws.id, name: trimmedName });
    sendSuccess(res, { workspace: formatWorkspace(ws, []) }, 201);
  } catch (err) {
    log.error("Workspace oluşturma hatası", { err });
    sendError(res, 400, "Oluşturma sırasında bir hata oluştu");
  }
}

// DELETE /api/workspaces/:id — Workspace sil
async function remove(req, res, id) {
  try {
    const ws = await Workspace.findByPk(id);
    if (!ws) {
      sendError(res, 404, "Çalışma alanı bulunamadı");
      return;
    }
    const wsName = ws.name;
    await Workspace.destroy({ where: { id } });

    const actorName = req.user ? req.user.name : "Sistem";
    await logActivity("workspace_deleted", `"${wsName}" çalışma alanı silindi`, `${actorName} çalışma alanını sildi.`, actorName, { workspaceName: wsName });

    log.info("Workspace silindi", { id, name: wsName });
    sendSuccess(res, { message: "Çalışma alanı silindi" });
  } catch (err) {
    log.error("Workspace silme hatası", { id, err });
    sendError(res, 500, "Silme sırasında bir hata oluştu");
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

    const actorName = req.user ? req.user.name : "Sistem";
    await logActivity("key_regenerated", `"${ws.name}" anahtarı yenilendi`, `${actorName} katılım anahtarını yeniledi.`, actorName, { workspaceId: ws.id });

    const clients = await WorkspaceClient.findAll({ where: { workspace_id: id } });
    sendSuccess(res, { workspace: formatWorkspace(ws, clients) });
  } catch (err) {
    log.error("Key yenileme hatası", { id, err });
    sendError(res, 500, "Key yenileme sırasında bir hata oluştu");
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

    // Upsert: aynı hostname + client_name tekrar katılırsa güncelle
    const [client, created] = await WorkspaceClient.findOrCreate({
      where: { workspace_id: ws.id, hostname: hostname || "unknown", client_name: clientName || "Anonim" },
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

    await logActivity("client_joined", `İstemci "${ws.name}" alanına katıldı`, `${clientName || "Anonim"} (${hostname || "unknown"}) bağlandı.`, clientName || "Anonim", { workspaceId: ws.id, hostname });

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
    log.error("Workspace katılım hatası", { err });
    sendError(res, 400, "Katılım sırasında bir hata oluştu");
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
    log.error("Key doğrulama hatası", { err });
    sendError(res, 400, "Doğrulama sırasında bir hata oluştu");
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
    const { Workspace, WorkspaceClient, User } = require("../models/index");
    const { Op } = require("sequelize");

    const totalWorkspaces = await Workspace.count();
    const onlineWorkspaces = await Workspace.count({ where: { status: "online" } });
    const totalClients = await WorkspaceClient.count();
    const onlineClients = await WorkspaceClient.count({ where: { is_online: true } });
    const totalUsers = await User.count();

    // Bu hafta oluşturulan workspace sayısı
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const newThisWeek = await Workspace.count({
      where: { created_at: { [Op.gte]: oneWeekAgo } },
    });

    sendSuccess(res, {
      stats: {
        totalWorkspaces,
        onlineWorkspaces,
        totalClients,
        onlineClients,
        totalUsers,
        newThisWeek,
      },
    });
  } catch (err) {
    log.error("İstatistik hatası", { err });
    sendError(res, 500, "İstatistik alınamadı");
  }
}

// GET /api/users — Kullanıcı listesi
async function listUsers(req, res) {
  try {
    const { User } = require("../models/index");
    const users = await User.findAll({
      attributes: ["id", "name", "email", "role", "created_at"],
      order: [["created_at", "ASC"]],
    });
    sendSuccess(res, { users: users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.created_at || u.createdAt })) });
  } catch (err) {
    log.error("Kullanıcı listesi hatası", { err });
    sendError(res, 500, "Kullanıcı listesi alınamadı");
  }
}

// POST /api/users — Yeni kullanıcı oluştur
async function createUser(req, res) {
  try {
    const { User } = require("../models/index");
    const body = await parseBody(req);
    const { name, email, password, role } = body;

    if (!name || !email || !password) {
      sendError(res, 400, "Ad, e-posta ve şifre zorunludur");
      return;
    }
    if (password.length < 6) {
      sendError(res, 400, "Şifre en az 6 karakter olmalıdır");
      return;
    }

    const user = await User.create({
      name: name.trim(),
      email: email.trim(),
      password,
      role: role || "Üye",
    });

    const actorName = req.user ? req.user.name : "Sistem";
    await logActivity("user_created", `"${user.name}" kullanıcısı oluşturuldu`, `${actorName} yeni bir kullanıcı ekledi.`, actorName, { userId: user.id, userName: user.name });

    log.info("Kullanıcı oluşturuldu", { userId: user.id, name: user.name });
    sendSuccess(res, { user: { id: user.id, name: user.name, email: user.email, role: user.role } }, 201);
  } catch (err) {
    log.error("Kullanıcı oluşturma hatası", { err });
    const message = err.name === "SequelizeUniqueConstraintError"
      ? "Bu e-posta adresi zaten kullanılıyor"
      : "Kullanıcı oluşturulurken bir hata oluştu";
    sendError(res, 400, message);
  }
}

// DELETE /api/users/:id — Kullanıcı sil
async function deleteUser(req, res, id) {
  try {
    const { User } = require("../models/index");
    const user = await User.findByPk(id);
    if (!user) {
      sendError(res, 404, "Kullanıcı bulunamadı");
      return;
    }

    // Kendini silmeyi engelle
    if (req.user && req.user.email === user.email) {
      sendError(res, 400, "Kendi hesabınızı silemezsiniz");
      return;
    }

    // Sadece Yönetici rolü silme yapabilir
    if (!req.user || req.user.role !== "Yönetici") {
      sendError(res, 403, "Bu işlem için yönetici yetkisi gereklidir");
      return;
    }

    const userName = user.name;
    await user.destroy();

    const actorName = req.user ? req.user.name : "Sistem";
    await logActivity("user_deleted", `"${userName}" kullanıcısı silindi`, `${actorName} kullanıcıyı sildi.`, actorName, { userName });

    log.info("Kullanıcı silindi", { userId: id, name: userName });
    sendSuccess(res, { message: "Kullanıcı silindi" });
  } catch (err) {
    log.error("Kullanıcı silme hatası", { id, err });
    sendError(res, 500, "Kullanıcı silinirken bir hata oluştu");
  }
}

// GET /api/activities — Son aktiviteler
async function listActivities(req, res) {
  try {
    const { ActivityLog } = require("../models/index");
    const url = new URL(req.url, "http://localhost");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10), 100);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);

    const { count, rows } = await ActivityLog.findAndCountAll({
      order: [["created_at", "DESC"]],
      limit,
      offset,
    });

    sendSuccess(res, {
      activities: rows.map(a => ({
        id: a.id,
        type: a.type,
        title: a.title,
        description: a.description,
        actorName: a.actor_name,
        meta: a.meta,
        createdAt: a.created_at || a.createdAt,
      })),
      total: count,
      limit,
      offset,
    });
  } catch (err) {
    log.error("Aktivite listesi hatası", { err });
    sendError(res, 500, "Aktivite listesi alınamadı");
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
  listUsers,
  createUser,
  deleteUser,
  listActivities,
};
