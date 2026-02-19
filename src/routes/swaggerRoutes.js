const fs = require("fs");
const path = require("path");

/**
 * Swagger UI route'ları
 *
 * swagger-ui-dist paketinden statik dosyaları serve eder
 * /api-docs → Swagger UI
 * /api-docs/swagger.json → OpenAPI spec
 */

const swaggerUiDistPath = path.dirname(require.resolve("swagger-ui-dist/package.json"));
const swaggerSpec = require("../config/swagger.json");

const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".map": "application/json",
};

function match(req) {
  const url = req.url.split("?")[0];
  const method = req.method;

  if (method !== "GET") return null;

  // /api-docs/swagger.json → OpenAPI spec
  if (url === "/api-docs/swagger.json") {
    return (req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(swaggerSpec));
    };
  }

  // /api-docs → Swagger UI (özelleştirilmiş HTML)
  if (url === "/api-docs" || url === "/api-docs/") {
    return (req, res) => {
      const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>Taskey API — Swagger UI</title>
  <link rel="stylesheet" href="/api-docs/swagger-ui.css">
  <style>
    html { box-sizing: border-box; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin: 0; background: #fafafa; }
    .topbar { display: none !important; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="/api-docs/swagger-ui-bundle.js"></script>
  <script src="/api-docs/swagger-ui-standalone-preset.js"></script>
  <script>
    SwaggerUIBundle({
      url: "/api-docs/swagger.json",
      dom_id: "#swagger-ui",
      deepLinking: true,
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
      layout: "StandaloneLayout",
    });
  </script>
</body>
</html>`;
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(html);
    };
  }

  // /api-docs/* → swagger-ui-dist statik dosyaları
  if (url.startsWith("/api-docs/")) {
    const fileName = url.replace("/api-docs/", "");
    const filePath = path.join(swaggerUiDistPath, fileName);

    // Path traversal koruması
    if (!filePath.startsWith(swaggerUiDistPath)) return null;

    return (req, res) => {
      fs.readFile(filePath, (err, content) => {
        if (err) {
          res.writeHead(404);
          res.end("Not Found");
          return;
        }
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME[ext] || "application/octet-stream";
        res.writeHead(200, { "Content-Type": contentType });
        res.end(content);
      });
    };
  }

  return null;
}

module.exports = { match };
