const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ===== Logging =====
const log = require("./src/utils/logger");
const errorHandler = require("./src/middleware/errorHandler");
const { validate, schemas } = require("./src/middleware/validate");

// ===== Database & ORM =====
const { initDatabase } = require("./src/config/database");
const { seedDatabase } = require("./src/config/seed");
// Modelleri ve ilişkileri yükle (sync öncesi gerekli)
const { User } = require("./src/models/index");

// MVC Routes
const { matchRoute } = require("./src/routes");
const authMiddleware = require("./src/middleware/auth");

const PORT = process.env.PORT || 3000;

// ===== Session store (in-memory) =====
const sessions = new Map();
const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 saat

function createSession(user) {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, { email: user.email, name: user.name, role: user.role, createdAt: Date.now() });
  log.debug("Oturum oluşturuldu", { email: user.email });
  return token;
}

function getSession(token) {
  const session = sessions.get(token);
  if (!session) return null;
  // Süresi dolmuş oturumları temizle
  if (Date.now() - session.createdAt > SESSION_TTL) {
    sessions.delete(token);
    return null;
  }
  return session;
}

function destroySession(token) {
  sessions.delete(token);
}

// ===== Parse JSON body =====
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      try { resolve(JSON.parse(body)); }
      catch { reject(new Error("Invalid JSON")); }
    });
    req.on("error", reject);
  });
}

// ===== Extract token from cookie or Authorization header =====
function extractToken(req) {
  const auth = req.headers["authorization"];
  if (auth && auth.startsWith("Bearer ")) {
    return auth.slice(7);
  }
  const cookie = req.headers["cookie"];
  if (cookie) {
    const match = cookie.split(";").map(c => c.trim()).find(c => c.startsWith("taskey_token="));
    if (match) return match.split("=")[1];
  }
  return null;
}

const MIME_TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

const PUBLIC_ROOT = path.join(__dirname, "public");

// Auth middleware'e session store'u paylaş
authMiddleware.init(sessions);

const server = http.createServer(async (req, res) => {
  const startTime = Date.now();

  // İstek tamamlandığında log yaz
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    // Statik dosya isteklerini debug seviyesinde logla
    if (req.url && !req.url.startsWith("/api")) {
      log.debug("Static", { method: req.method, url: req.url, status: res.statusCode, duration: `${duration}ms` });
    } else {
      log.req(req, res, duration);
    }
  });

  // ===== MVC Routes (src/ altındaki route'lar) =====
  const routeHandler = matchRoute(req);
  if (routeHandler) {
    try {
      await routeHandler(req, res);
    } catch (err) {
      log.error("Route handler hatası", { method: req.method, url: req.url, err });
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, message: "Sunucu hatası" }));
      }
    }
    return;
  }

  // ===== Setup API Routes =====
  if (req.url === "/api/setup/status" && req.method === "GET") {
    try {
      const userCount = await User.count();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ needsSetup: userCount === 0 }));
    } catch (err) {
      log.error("Setup status kontrol hatası", { err });
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Sunucu hatası" }));
    }
    return;
  }

  if (req.url === "/api/setup" && req.method === "POST") {
    try {
      const userCount = await User.count();
      if (userCount > 0) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Kurulum zaten tamamlanmış" }));
        return;
      }
      const body = await validate(req, res, schemas.setup);
      if (!body) return;
      const { name, email, password } = body;
      const user = await User.create({
        name,
        email,
        password,
        role: "Yönetici",
      });
      log.info("Root hesap oluşturuldu", { email: user.email });
      // Log activity
      try {
        const { logActivity } = require("./src/utils/activityLogger");
        await logActivity("user_created", `"${user.name}" root hesabı oluşturuldu`, "İlk kurulum tamamlandı.", user.name, { userId: user.id });
      } catch (_) {}
      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, message: "Hesap başarıyla oluşturuldu" }));
    } catch (err) {
      log.error("Kurulum hatası", { err });
      const message = err.name === "SequelizeUniqueConstraintError"
        ? "Bu e-posta adresi zaten kullanılıyor"
        : "Kurulum sırasında bir hata oluştu";
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message }));
    }
    return;
  }

  // ===== Auth API Routes (DB-backed) =====
  if (req.url === "/api/login" && req.method === "POST") {
    try {
      const { email, password } = await parseBody(req);
      const user = await User.findOne({ where: { email } });
      if (!user) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Geçersiz e-posta veya şifre" }));
        return;
      }
      // Parolayı güvenli bir şekilde doğrula (hash + sabit süreli karşılaştırma)
      if (!User.verifyPassword(password, user.password)) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Geçersiz e-posta veya şifre" }));
        return;
      }
      const token = createSession(user);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ token, user: { name: user.name, email: user.email, role: user.role } }));
    } catch (err) {
      log.warn("Login hatası", { err });
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Geçersiz istek" }));
    }
    return;
  }

  if (req.url === "/api/logout" && req.method === "POST") {
    const token = extractToken(req);
    if (token) destroySession(token);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Çıkış yapıldı" }));
    return;
  }

  if (req.url === "/api/me" && req.method === "GET") {
    const token = extractToken(req);
    const session = token ? getSession(token) : null;
    if (!session) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Oturum bulunamadı" }));
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ user: { name: session.name, email: session.email, role: session.role } }));
    return;
  }

  // ===== Static file serving =====
  let parsedUrl;
  try {
    parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  } catch {
    res.writeHead(400, { "Content-Type": "text/html" });
    res.end("<h1>400 - Bad Request</h1>");
    return;
  }

  const pathname = decodeURIComponent(parsedUrl.pathname);
  const safePath = pathname === "/" || pathname === "/index.html" ? "index.html" : pathname.replace(/^\//, "");

  const filePath = path.resolve(PUBLIC_ROOT, safePath);
  if (!filePath.startsWith(PUBLIC_ROOT + path.sep) && filePath !== PUBLIC_ROOT) {
    res.writeHead(403, { "Content-Type": "text/html" });
    res.end("<h1>403 - Forbidden</h1>");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === "ENOENT") {
        res.writeHead(404, { "Content-Type": "text/html" });
        res.end("<h1>404 - Not Found</h1>");
      } else {
        res.writeHead(500);
        res.end("Server Error");
      }
    } else {
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content);
    }
  });
});

// ===== Bootstrap: DB → Seed → Listen =====
(async () => {
  try {
    await initDatabase();
    await seedDatabase();

    // Process-level error handler ve graceful shutdown
    errorHandler.init(server);

    server.listen(PORT, () => {
      log.banner(PORT);
    });
  } catch (err) {
    log.error("Sunucu başlatılamadı", { err });
    process.exit(1);
  }
})();
