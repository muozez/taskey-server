const { sendError } = require("../utils/response");

// ===== Session store referansı server.js'den alınacak =====
let _sessions = null;
const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 saat

function init(sessionsMap) {
  _sessions = sessionsMap;
}

/**
 * Token doğrulama — korunan endpoint'ler için
 * Başarılı ise req.user set eder ve true döner
 */
function requireAuth(req, res) {
  const token = extractToken(req);
  if (!token || !_sessions) {
    sendError(res, 401, "Oturum bulunamadı");
    return false;
  }
  const session = _sessions.get(token);
  if (!session) {
    sendError(res, 401, "Geçersiz veya süresi dolmuş oturum");
    return false;
  }
  // Süresi dolmuş oturumları kontrol et
  if (Date.now() - session.createdAt > SESSION_TTL) {
    _sessions.delete(token);
    sendError(res, 401, "Oturum süresi dolmuş, lütfen tekrar giriş yapın");
    return false;
  }
  req.user = session;
  return true;
}

function extractToken(req) {
  // Authorization header
  const auth = req.headers["authorization"];
  if (auth && auth.startsWith("Bearer ")) {
    return auth.slice(7);
  }
  // Cookie
  const cookie = req.headers["cookie"];
  if (cookie) {
    const match = cookie.split(";").map((c) => c.trim()).find((c) => c.startsWith("taskey_token="));
    if (match) return match.split("=")[1];
  }
  return null;
}

module.exports = { init, requireAuth, extractToken };
