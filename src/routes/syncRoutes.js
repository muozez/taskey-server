const syncController = require("../controllers/syncController");
const { requireAuth } = require("../middleware/auth");

/**
 * Sync route'ları
 *
 * Public (lokal client'lar — clientId ile doğrulanır):
 *   POST   /api/sync/push          — Diff'leri gönder
 *   GET    /api/sync/pull           — Son değişiklikleri çek
 *   POST   /api/sync/full           — Tam snapshot ile senkronizasyon
 *   POST   /api/sync/heartbeat     — Online durumu bildir
 *
 * Protected (dashboard — auth gerekli):
 *   GET    /api/sync/status         — Sync durumu
 *   GET    /api/sync/conflicts      — Conflict listesi
 *   POST   /api/sync/resolve        — Tekil conflict çöz
 *   POST   /api/sync/resolve-batch  — Toplu conflict çöz
 *   PATCH  /api/sync/strategy       — Sync stratejisini güncelle
 */

function match(req) {
  const url = req.url.split("?")[0];
  const method = req.method;

  // === Public routes (lokal client'lar) ===
  if (url === "/api/sync/push" && method === "POST") {
    return (req, res) => syncController.push(req, res);
  }

  if (url === "/api/sync/pull" && method === "GET") {
    return (req, res) => syncController.pull(req, res);
  }

  if (url === "/api/sync/full" && method === "POST") {
    return (req, res) => syncController.fullSync(req, res);
  }

  if (url === "/api/sync/heartbeat" && method === "POST") {
    return (req, res) => syncController.heartbeat(req, res);
  }

  // === Protected routes (dashboard) ===
  if (url === "/api/sync/status" && method === "GET") {
    return (req, res) => {
      if (!requireAuth(req, res)) return;
      syncController.status(req, res);
    };
  }

  if (url === "/api/sync/conflicts" && method === "GET") {
    return (req, res) => {
      if (!requireAuth(req, res)) return;
      syncController.conflicts(req, res);
    };
  }

  if (url === "/api/sync/resolve" && method === "POST") {
    return (req, res) => {
      if (!requireAuth(req, res)) return;
      syncController.resolve(req, res);
    };
  }

  if (url === "/api/sync/resolve-batch" && method === "POST") {
    return (req, res) => {
      if (!requireAuth(req, res)) return;
      syncController.resolveBatch(req, res);
    };
  }

  if (url === "/api/sync/strategy" && method === "PATCH") {
    return (req, res) => {
      if (!requireAuth(req, res)) return;
      syncController.updateStrategy(req, res);
    };
  }

  return null;
}

module.exports = { match };
