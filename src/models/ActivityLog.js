const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

/**
 * Sistem genelindeki aktiviteleri kaydeder.
 * Türler: workspace_created, workspace_deleted, user_created, user_deleted, client_joined, key_regenerated
 */
const ActivityLog = sequelize.define("ActivityLog", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  type: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: "",
  },
  actor_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  meta: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
  },
}, {
  tableName: "activity_logs",
  indexes: [
    { fields: ["created_at"] },
    { fields: ["type"] },
  ],
});

module.exports = ActivityLog;
