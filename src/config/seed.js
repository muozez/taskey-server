const { User } = require("../models/index");
const log = require("../utils/logger");

/**
 * Seed artık varsayılan kullanıcı/workspace oluşturmaz.
 * İlk açılışta setup sayfası üzerinden root hesap oluşturulur.
 */
async function seedDatabase() {
  try {
    const userCount = await User.count();
    if (userCount === 0) {
      log.info("Henüz kullanıcı yok — kurulum gerekli");
    } else {
      log.info("Mevcut kullanıcılar yüklendi", { count: userCount });
    }
  } catch (err) {
    log.error("Seed hatası", { err });
  }
}

module.exports = { seedDatabase };
