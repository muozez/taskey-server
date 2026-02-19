const WorkspaceModel = require("../models/workspace");
const { sendSuccess, sendError } = require("../utils/response");
const { parseBody } = require("../utils/parseBody");
const { isValidKeyFormat } = require("../utils/keyGenerator");

/**
 * Workspace Controller
 * Dashboard (korunan) ve public (join) endpoint'lerini yönetir
 */

// GET /api/workspaces — Tüm workspace'leri listele
async function list(req, res) {
  const workspaces = WorkspaceModel.getAll();
  sendSuccess(res, { workspaces });
}

// GET /api/workspaces/:id — Tek workspace detayı
async function getById(req, res, id) {
  const ws = WorkspaceModel.getById(id);
  if (!ws) {
    sendError(res, 404, "Çalışma alanı bulunamadı");
    return;
  }
  sendSuccess(res, { workspace: ws });
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

    const workspace = WorkspaceModel.create({
      name: name.trim(),
      server: server.trim(),
      description: (description || "").trim(),
    });

    sendSuccess(res, { workspace }, 201);
  } catch (err) {
    sendError(res, 400, "Geçersiz istek: " + err.message);
  }
}

// DELETE /api/workspaces/:id — Workspace sil
async function remove(req, res, id) {
  const deleted = WorkspaceModel.deleteById(id);
  if (!deleted) {
    sendError(res, 404, "Çalışma alanı bulunamadı");
    return;
  }
  sendSuccess(res, { message: "Çalışma alanı silindi" });
}

// POST /api/workspaces/:id/regenerate-key — Join key yenile
async function regenerateKey(req, res, id) {
  const ws = WorkspaceModel.regenerateKey(id);
  if (!ws) {
    sendError(res, 404, "Çalışma alanı bulunamadı");
    return;
  }
  sendSuccess(res, { workspace: ws });
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

    const result = WorkspaceModel.joinWithKey(joinKey.toUpperCase(), {
      name: clientName || "Anonim",
      hostname: hostname || "unknown",
    });

    if (!result) {
      sendError(res, 404, "Bu anahtarla eşleşen çalışma alanı bulunamadı");
      return;
    }

    sendSuccess(res, {
      message: "Çalışma alanına başarıyla katıldınız",
      workspace: {
        id: result.workspace.id,
        name: result.workspace.name,
        status: result.workspace.status,
      },
      client: result.client,
    });
  } catch (err) {
    sendError(res, 400, "Geçersiz istek: " + err.message);
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

    const ws = WorkspaceModel.getByJoinKey(joinKey.toUpperCase());
    if (!ws) {
      sendSuccess(res, { valid: false, message: "Anahtar ile eşleşen alan bulunamadı" });
      return;
    }

    sendSuccess(res, {
      valid: true,
      workspace: { id: ws.id, name: ws.name, status: ws.status },
    });
  } catch (err) {
    sendError(res, 400, "Geçersiz istek: " + err.message);
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
};
