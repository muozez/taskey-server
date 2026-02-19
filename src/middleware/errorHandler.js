/**
 * Global Error Handler & Process Guards
 *
 * Production'da:
 *   - uncaughtException ve unhandledRejection loglanır
 *   - Process graceful shutdown yapar
 *   - Route handler hataları yapısal loglanır
 *
 * Kullanım:
 *   const errorHandler = require("./middleware/errorHandler");
 *   errorHandler.init(server);
 *   // Route içinde:
 *   errorHandler.wrap(handler)(req, res);
 */

const log = require("../utils/logger");
const { sendError } = require("../utils/response");

/**
 * Async route handler'ı try/catch ile sarar
 * Hata oluşursa yapısal log + 500 yanıtı döner
 */
function wrap(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      log.error("İstek işleme hatası", {
        method: req.method,
        url: req.url,
        err,
      });

      // Yanıt zaten gönderilmişse dokunma
      if (res.headersSent) return;

      const message =
        process.env.NODE_ENV === "production"
          ? "Sunucu hatası"
          : err.message || "Bilinmeyen hata";

      sendError(res, 500, message);
    }
  };
}

/**
 * Process-level hata yakalayıcıları kur
 * @param {http.Server} server — graceful shutdown için
 */
function init(server) {
  // Yakalanmayan exception
  process.on("uncaughtException", (err) => {
    log.error("Yakalanmayan istisna — process kapatılıyor", { err });
    gracefulShutdown(server, 1);
  });

  // Yakalanmayan promise rejection
  process.on("unhandledRejection", (reason) => {
    log.error("Yakalanmayan promise rejection", {
      err: reason instanceof Error ? reason : new Error(String(reason)),
    });
    // Production'da process'i kapat (fail-fast)
    if (process.env.NODE_ENV === "production") {
      gracefulShutdown(server, 1);
    }
  });

  // SIGTERM (Docker stop, k8s)
  process.on("SIGTERM", () => {
    log.info("SIGTERM alındı — graceful shutdown başlatılıyor");
    gracefulShutdown(server, 0);
  });

  // SIGINT (Ctrl+C)
  process.on("SIGINT", () => {
    log.info("SIGINT alındı — graceful shutdown başlatılıyor");
    gracefulShutdown(server, 0);
  });
}

/**
 * Graceful shutdown
 * 1. Yeni bağlantı kabul etmeyi durdur
 * 2. Mevcut bağlantıların bitmesini bekle (max 10s)
 * 3. DB bağlantısını kapat
 * 4. Process'i çık
 */
function gracefulShutdown(server, exitCode) {
  const TIMEOUT = 10_000;

  log.info("Sunucu kapatılıyor...", { timeout: `${TIMEOUT / 1000}s` });

  // Yeni bağlantıları reddet
  server.close(async () => {
    log.info("HTTP sunucusu kapatıldı");

    try {
      const { sequelize } = require("../config/database");
      await sequelize.close();
      log.info("Veritabanı bağlantısı kapatıldı");
    } catch (err) {
      log.error("DB kapatma hatası", { err });
    }

    process.exit(exitCode);
  });

  // Timeout: zorla kapat
  setTimeout(() => {
    log.error("Graceful shutdown zaman aşımı — zorla kapatılıyor");
    process.exit(1);
  }, TIMEOUT).unref();
}

module.exports = { wrap, init };
