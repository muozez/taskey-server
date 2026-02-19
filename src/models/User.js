const { DataTypes } = require("sequelize");
const crypto = require("crypto");
const { sequelize } = require("../config/database");

/**
 * SHA-256 ile parola hash'le
 */
function hashPassword(password) {
  return crypto.createHash("sha256").update(password, "utf8").digest("hex");
}

/**
 * Timing-safe parola karşılaştırması
 */
function verifyPassword(plainPassword, hashedPassword) {
  const inputHash = hashPassword(plainPassword);
  try {
    const storedBuffer = Buffer.from(hashedPassword, "hex");
    const inputBuffer = Buffer.from(inputHash, "hex");
    if (storedBuffer.length !== inputBuffer.length) return false;
    return crypto.timingSafeEqual(storedBuffer, inputBuffer);
  } catch {
    return false;
  }
}

const User = sequelize.define("User", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  role: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: "Üye",
  },
}, {
  tableName: "users",
  hooks: {
    beforeCreate: (user) => {
      if (user.password && !user.password.match(/^[a-f0-9]{64}$/)) {
        user.password = hashPassword(user.password);
      }
    },
    beforeUpdate: (user) => {
      if (user.changed("password") && !user.password.match(/^[a-f0-9]{64}$/)) {
        user.password = hashPassword(user.password);
      }
    },
  },
});

User.verifyPassword = verifyPassword;

module.exports = User;
