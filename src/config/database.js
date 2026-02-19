const { Sequelize } = require("sequelize");

const config = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  database: process.env.DB_NAME || "taskey",
  username: process.env.DB_USER || "taskey",
  password: process.env.DB_PASS || "taskey_secret",
  dialect: "postgres",
  logging: process.env.NODE_ENV === "production" ? false : console.log,
  pool: {
    max: 10,
    min: 2,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    timestamps: true,
    underscored: true,
  },
};

const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    port: config.port,
    dialect: config.dialect,
    logging: config.logging,
    pool: config.pool,
    define: config.define,
  }
);

/**
 * Veritabanı bağlantısını test et ve tabloları senkronize et
 */
async function initDatabase() {
  try {
    await sequelize.authenticate();
    console.log("[DB] PostgreSQL bağlantısı başarılı");

    // Model tanımları yüklendikten sonra sync çağrılır
    await sequelize.sync({ alter: process.env.NODE_ENV !== "production" });
    console.log("[DB] Tablolar senkronize edildi");

    return true;
  } catch (err) {
    console.error("[DB] Bağlantı hatası:", err.message);
    return false;
  }
}

module.exports = { sequelize, initDatabase };
