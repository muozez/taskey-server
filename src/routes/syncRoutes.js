const syncController = require("../controllers/syncController");
const { requireAuth } = require("../middleware/auth");

/**
 * Sync route'ları
 *
 * Public (lokal client'lar — clientId ile doğrulanır):
 *   POST   /api/sync/push        — Diff'leri gönder
 *   GET    /api/sync/pull         — Son değişiklikleri çek
 *   POST   /api/sync/heartbeat   — Online durumu bildir
 *
 * Protected (dashboard — auth gerekli):
 *   GET    /api/sync/status       — Sync durumu
 *   POST   /api/sync/resolve      — Conflict çöz
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

  if (url === "/api/sync/resolve" && method === "POST") {
    return (req, res) => {
      if (!requireAuth(req, res)) return;
      syncController.resolve(req, res);
    };
  }

  return null;
}

module.exports = { match };
