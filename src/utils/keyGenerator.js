const crypto = require("crypto");

/**
 * Workspace katılım anahtarı üretir.
 * Format: XXXX-YYYY (8 karakter, büyük harf alfanümerik)
 * Charset: A-Z, 0-9 (belirsizliği önlemek için O, 0, I, 1 hariç)
 */
const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 karakter

function generateJoinKey() {
  const bytes = crypto.randomBytes(8);
  let key = "";
  for (let i = 0; i < 8; i++) {
    key += CHARSET[bytes[i] % CHARSET.length];
  }
  return `${key.slice(0, 4)}-${key.slice(4, 8)}`;
}

/**
 * Key formatını doğrular: XXXX-YYYY
 * CHARSET ile uyumlu: O, 0, I, 1 hariç (karışıklığı önlemek için)
 */
function isValidKeyFormat(key) {
  if (typeof key !== "string") return false;
  return /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/.test(key.toUpperCase());
}

module.exports = { generateJoinKey, isValidKeyFormat };
