const { Sequelize } = require("sequelize");
const log = require("../utils/logger");

const config = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  database: process.env.DB_NAME || "taskey",
  username: process.env.DB_USER || "taskey",
  password: process.env.DB_PASS || "taskey_secret",
  dialect: "postgres",
  logging: process.env.NODE_ENV === "production" ? false : (sql) => log.debug("SQL", { query: sql }),
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
    log.info("PostgreSQL bağlantısı başarılı", { host: config.host, port: config.port, db: config.database });

    // Model tanımları yüklendikten sonra sync çağrılır
    await sequelize.sync({ alter: process.env.NODE_ENV !== "production" });
    log.info("Tablolar senkronize edildi");

    return true;
  } catch (err) {
    log.error("Veritabanı bağlantı hatası", { host: config.host, port: config.port, err });
    return false;
  }
}

module.exports = { sequelize, initDatabase };
