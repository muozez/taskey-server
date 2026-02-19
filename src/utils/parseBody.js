/**
 * HTTP isteğinden JSON body ayrıştırır
 * Maksimum body boyutu: 1MB (DoS koruması)
 */
const MAX_BODY_SIZE = 1 * 1024 * 1024; // 1MB

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) {
        req.destroy();
        reject(new Error("Body too large (max 1MB)"));
        return;
      }
      body += chunk;
    });
    req.on("end", () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { reject(new Error("Invalid JSON")); }
    });
    req.on("error", reject);
  });
}

module.exports = { parseBody };
