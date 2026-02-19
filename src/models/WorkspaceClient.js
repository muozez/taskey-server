const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

/**
 * Workspace'e join key ile bağlanan lokal node'lar
 */
const WorkspaceClient = sequelize.define("WorkspaceClient", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  workspace_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: "workspaces", key: "id" },
  },
  client_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: "Anonim",
  },
  hostname: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  /**
   * Client'ın en son başarıyla senkronize ettiği workspace versiyonu
   * Reconcile sonrası güncellenir
   */
  last_synced_version: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  /**
   * Son görülme zamanı — heartbeat ile güncellenir
   */
  last_seen_at: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW,
  },
  is_online: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
}, {
  tableName: "workspace_clients",
  indexes: [
    { fields: ["workspace_id"] },
    { unique: true, fields: ["workspace_id", "hostname", "client_name"] },
  ],
});

module.exports = WorkspaceClient;
