const { ActivityLog } = require("../models/index");
const log = require("./logger");

/**
 * Aktivite kaydet
 * @param {string} type - workspace_created | workspace_deleted | user_created | user_deleted | client_joined | key_regenerated
 * @param {string} title - Kısa başlık
 * @param {string} description - Detay açıklama
 * @param {string} actorName - İşlemi yapan kişi
 * @param {object} meta - Ek veri (isteğe bağlı)
 */
async function logActivity(type, title, description = "", actorName = "", meta = {}) {
  try {
    await ActivityLog.create({ type, title, description, actor_name: actorName, meta });
    log.debug("Aktivite kaydedildi", { type, title, actor: actorName });
  } catch (err) {
    log.error("Aktivite log kaydı başarısız", { type, title, err });
  }
}

module.exports = { logActivity };
