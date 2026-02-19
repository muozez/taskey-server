const workspaceRoutes = require("./workspaceRoutes");

/**
 * Tüm route modüllerini birleştirir.
 * Yeni modül eklemek için routers dizisine eklemeniz yeterli.
 *
 * @returns {Function|null} Eşleşen handler veya null
 */
const routers = [
  workspaceRoutes,
];

function matchRoute(req) {
  for (const router of routers) {
    const handler = router.match(req);
    if (handler) return handler;
  }
  return null;
}

module.exports = { matchRoute };
