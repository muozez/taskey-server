const { User } = require("../models/index");

/**
 * Seed artık varsayılan kullanıcı/workspace oluşturmaz.
 * İlk açılışta setup sayfası üzerinden root hesap oluşturulur.
 */
async function seedDatabase() {
  try {
    const userCount = await User.count();
    if (userCount === 0) {
      console.log("[Seed] Henüz kullanıcı yok — kurulum gerekli (setup sayfasına yönlendirilecek)");
    } else {
      console.log(`[Seed] ${userCount} kullanıcı mevcut — kurulum tamamlanmış`);
    }
  } catch (err) {
    console.error("[Seed] Hata:", err.message);
  }
}

module.exports = { seedDatabase };
