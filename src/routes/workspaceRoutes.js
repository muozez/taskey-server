const workspaceController = require("../controllers/workspaceController");
const { requireAuth } = require("../middleware/auth");
const { sendError } = require("../utils/response");

/**
 * Workspace route'ları
 *
 * Korunan (auth gerekli):
 *   GET    /api/workspaces             — Listele
 *   GET    /api/workspaces/:id         — Detay
 *   POST   /api/workspaces             — Oluştur
 *   DELETE /api/workspaces/:id         — Sil
 *   POST   /api/workspaces/:id/regenerate-key — Key yenile
 *
 * Public (auth gereksiz — lokal client'lar için):
 *   POST   /api/join                   — Key ile katıl
 *   POST   /api/validate-key           — Key doğrula
 */

function match(req) {
  const url = req.url.split("?")[0]; // Query string temizle
  const method = req.method;

  // === Public routes (auth gereksiz) ===
  if (url === "/api/join" && method === "POST") {
    return (req, res) => workspaceController.join(req, res);
  }

  if (url === "/api/validate-key" && method === "POST") {
    return (req, res) => workspaceController.validateKey(req, res);
  }

  // === Protected routes ===

  // POST /api/workspaces — Oluştur
  if (url === "/api/workspaces" && method === "POST") {
    return (req, res) => {
      if (!requireAuth(req, res)) return;
      workspaceController.create(req, res);
    };
  }

  // GET /api/workspaces — Listele
  if (url === "/api/workspaces" && method === "GET") {
    return (req, res) => {
      if (!requireAuth(req, res)) return;
      workspaceController.list(req, res);
    };
  }

  // Parameterized routes: /api/workspaces/:id/...
  const wsActionMatch = url.match(/^\/api\/workspaces\/([^/]+)\/regenerate-key$/);
  if (wsActionMatch && method === "POST") {
    const id = decodeURIComponent(wsActionMatch[1]);
    return (req, res) => {
      if (!requireAuth(req, res)) return;
      workspaceController.regenerateKey(req, res, id);
    };
  }

  // GET /api/workspaces/:id — Detay
  const wsDetailMatch = url.match(/^\/api\/workspaces\/([^/]+)$/);
  if (wsDetailMatch && method === "GET") {
    const id = decodeURIComponent(wsDetailMatch[1]);
    return (req, res) => {
      if (!requireAuth(req, res)) return;
      workspaceController.getById(req, res, id);
    };
  }

  // DELETE /api/workspaces/:id — Sil
  if (wsDetailMatch && method === "DELETE") {
    const id = decodeURIComponent(wsDetailMatch[1]);
    return (req, res) => {
      if (!requireAuth(req, res)) return;
      workspaceController.remove(req, res, id);
    };
  }

  return null; // Bu router eşleşmedi
}

module.exports = { match };
