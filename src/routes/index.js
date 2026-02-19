const workspaceRoutes = require("./workspaceRoutes");
const syncRoutes = require("./syncRoutes");
const swaggerRoutes = require("./swaggerRoutes");

/**
 * Tüm route modüllerini birleştirir.
 * Yeni modül eklemek için routers dizisine eklemeniz yeterli.
 *
 * @returns {Function|null} Eşleşen handler veya null
 */
const routers = [
  swaggerRoutes,
  workspaceRoutes,
  syncRoutes,
];

function matchRoute(req) {
  for (const router of routers) {
    const handler = router.match(req);
    if (handler) return handler;
  }
  return null;
}

module.exports = { matchRoute };
