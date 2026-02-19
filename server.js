const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// MVC Routes
const { matchRoute } = require("./src/routes");
const authMiddleware = require("./src/middleware/auth");

const PORT = process.env.PORT || 3000;

// ===== Simple user store =====
const USERS = [
  { email: "admin@taskey.com", password: "123456", name: "Muhammet", role: "Yönetici" },
];

// ===== Session store (in-memory) =====
const sessions = new Map();

function createSession(user) {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, { email: user.email, name: user.name, role: user.role, createdAt: Date.now() });
  return token;
}

function getSession(token) {
  return sessions.get(token) || null;
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
  // Check Authorization header
  const auth = req.headers["authorization"];
  if (auth && auth.startsWith("Bearer ")) {
    return auth.slice(7);
  }
  // Check cookies
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
  // ===== MVC Routes (src/ altındaki route'lar) =====
  const routeHandler = matchRoute(req);
  if (routeHandler) {
    try {
      await routeHandler(req, res);
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, message: "Sunucu hatası" }));
    }
    return;
  }

  // ===== Legacy API Routes =====
  if (req.url === "/api/login" && req.method === "POST") {
    try {
      const { email, password } = await parseBody(req);
      const user = USERS.find(u => u.email === email && u.password === password);
      if (!user) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Geçersiz e-posta veya şifre" }));
        return;
      }
      const token = createSession(user);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ token, user: { name: user.name, email: user.email, role: user.role } }));
    } catch {
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

  // Parse the URL to strip query strings and decode
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

  // Auth check is handled client-side via auth.js

  // Resolve and check for path traversal
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

server.listen(PORT, () => {
  console.log(`Taskey running at http://localhost:${PORT}`);
});
