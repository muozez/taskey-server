/**
 * Production-ready structured logger
 *
 * Formatlar:
 *   - production  → JSON (makine tarafından okunabilir, ELK/Loki ile uyumlu)
 *   - development → Renkli, okunabilir satırlar
 *
 * Log seviyeleri: error > warn > info > debug
 * NODE_ENV=production iken debug logları atlanır
 *
 * Kullanım:
 *   const log = require("./utils/logger");
 *   log.info("Sunucu başlatıldı", { port: 3000 });
 *   log.error("DB bağlantı hatası", { host: "localhost", err: error });
 *   log.req(req, res, durationMs);
 */

const os = require("os");

const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

const isProd = process.env.NODE_ENV === "production";
const minLevel = LOG_LEVELS[process.env.LOG_LEVEL] ?? (isProd ? LOG_LEVELS.info : LOG_LEVELS.debug);

// ANSI renkleri (sadece dev)
const C = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
  white: "\x1b[37m",
  bold: "\x1b[1m",
};

const LEVEL_COLORS = {
  error: C.red,
  warn: C.yellow,
  info: C.green,
  debug: C.gray,
};

const LEVEL_ICONS = {
  error: "✖",
  warn: "⚠",
  info: "●",
  debug: "·",
};

/**
 * ISO timestamp — her zaman UTC
 */
function ts() {
  return new Date().toISOString();
}

/**
 * Hata objesini serialize et
 */
function serializeError(err) {
  if (!err) return undefined;
  if (err instanceof Error) {
    return { message: err.message, stack: isProd ? undefined : err.stack, code: err.code };
  }
  return err;
}

/**
 * Meta içindeki err alanını normalize et
 */
function normalizeMeta(meta) {
  if (!meta || typeof meta !== "object") return {};
  const out = { ...meta };
  if (out.err) {
    out.error = serializeError(out.err);
    delete out.err;
  }
  return out;
}

/**
 * Production: tek satır JSON
 */
function jsonLine(level, msg, meta) {
  const entry = {
    ts: ts(),
    level,
    msg,
    pid: process.pid,
    hostname: os.hostname(),
    ...normalizeMeta(meta),
  };
  return JSON.stringify(entry);
}

/**
 * Development: renkli okunabilir satır
 *
 *   12:34:56.789 ● info  Sunucu başlatıldı  port=3000
 */
function prettyLine(level, msg, meta) {
  const now = new Date();
  const time = `${C.dim}${now.toLocaleTimeString("tr-TR", { hour12: false })}.${String(now.getMilliseconds()).padStart(3, "0")}${C.reset}`;
  const icon = LEVEL_ICONS[level] || "·";
  const color = LEVEL_COLORS[level] || C.white;
  const tag = `${color}${icon} ${level.padEnd(5)}${C.reset}`;

  let extra = "";
  const m = normalizeMeta(meta);
  if (Object.keys(m).length > 0) {
    const parts = [];
    for (const [k, v] of Object.entries(m)) {
      if (v === undefined) continue;
      const val = typeof v === "object" ? JSON.stringify(v) : String(v);
      parts.push(`${C.cyan}${k}${C.reset}${C.dim}=${C.reset}${val}`);
    }
    extra = "  " + parts.join(" ");
  }

  return `${time} ${tag} ${C.bold}${msg}${C.reset}${extra}`;
}

/**
 * Çıktıyı yaz
 */
function emit(level, msg, meta) {
  if (LOG_LEVELS[level] > minLevel) return;

  const line = isProd ? jsonLine(level, msg, meta) : prettyLine(level, msg, meta);

  if (level === "error" || level === "warn") {
    process.stderr.write(line + "\n");
  } else {
    process.stdout.write(line + "\n");
  }
}

// ======= PUBLIC API =======

function error(msg, meta) { emit("error", msg, meta); }
function warn(msg, meta) { emit("warn", msg, meta); }
function info(msg, meta) { emit("info", msg, meta); }
function debug(msg, meta) { emit("debug", msg, meta); }

/**
 * HTTP istek logu
 *
 *   POST /api/sync/push 200 12ms
 *
 * Production'da yapısal JSON:
 *   { ts, level: "info", msg: "HTTP", method, url, status, duration, ip, ua }
 */
function req(request, response, durationMs) {
  const method = request.method;
  const url = request.url;
  const status = response.statusCode;
  const ip = request.headers["x-forwarded-for"] || request.socket?.remoteAddress || "-";
  const ua = request.headers["user-agent"] || "-";

  const meta = { method, url, status, duration: `${durationMs}ms`, ip };

  if (isProd) {
    meta.ua = ua;
    emit(status >= 500 ? "error" : status >= 400 ? "warn" : "info", "HTTP", meta);
  } else {
    const statusColor = status >= 500 ? C.red : status >= 400 ? C.yellow : C.green;
    const line = prettyLine("info", "HTTP", {}) // sadece zaman + ikon
      .replace(/●\s+info\s+.*$/, "")           // temizle
      + `${C.bold}${method.padEnd(7)}${C.reset} `
      + `${url} `
      + `${statusColor}${status}${C.reset} `
      + `${C.dim}${durationMs}ms${C.reset}`;

    process.stdout.write(line + "\n");
  }
}

/**
 * Startup banner
 */
function banner(port) {
  if (isProd) {
    info("Server started", { port, node: process.version, pid: process.pid });
  } else {
    const lines = [
      "",
      `${C.cyan}${C.bold}  ╔════════════════════════════════════╗${C.reset}`,
      `${C.cyan}${C.bold}  ║${C.reset}   ${C.bold}Taskey Server${C.reset}                    ${C.cyan}${C.bold}║${C.reset}`,
      `${C.cyan}${C.bold}  ╠════════════════════════════════════╣${C.reset}`,
      `${C.cyan}${C.bold}  ║${C.reset}  ${C.green}▸${C.reset} http://localhost:${port}            ${C.cyan}${C.bold}║${C.reset}`,
      `${C.cyan}${C.bold}  ║${C.reset}  ${C.green}▸${C.reset} Swagger: /api-docs              ${C.cyan}${C.bold}║${C.reset}`,
      `${C.cyan}${C.bold}  ║${C.reset}  ${C.dim}PID ${process.pid} · Node ${process.version}${C.reset}       ${C.cyan}${C.bold}║${C.reset}`,
      `${C.cyan}${C.bold}  ╚════════════════════════════════════╝${C.reset}`,
      "",
    ];
    process.stdout.write(lines.join("\n") + "\n");
  }
}

module.exports = { error, warn, info, debug, req, banner, C };
