const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");
const { generateJoinKey } = require("../utils/keyGenerator");

const Workspace = sequelize.define("Workspace", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  abbr: {
    type: DataTypes.STRING(4),
    allowNull: false,
  },
  color: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: "indigo",
  },
  status: {
    type: DataTypes.ENUM("online", "offline", "pending"),
    allowNull: false,
    defaultValue: "pending",
  },
  server: {
    type: DataTypes.STRING(200),
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: "",
  },
  join_key: {
    type: DataTypes.STRING(9), // XXXX-YYYY
    allowNull: false,
    unique: true,
    defaultValue: () => generateJoinKey(),
  },
  owner_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: "users", key: "id" },
  },
  /**
   * Her workspace'in son onaylanmış veri versiyonu
   * Sürüm numarası her reconcile'da +1 artar
   */
  current_version: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
}, {
  tableName: "workspaces",
  indexes: [
    { unique: true, fields: ["join_key"] },
    { fields: ["owner_id"] },
  ],
});

module.exports = Workspace;
