const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

/**
 * Diff Entry — Lokal node'lardan gelen değişiklikler
 *
 * Akış:
 *   1. Lokal client değişiklik yapar → diff üretir
 *   2. Diff, POST /api/sync/push ile sunucuya gönderilir
 *   3. Sunucu diff'i kaydeder (status: pending)
 *   4. Reconcile işlemi diff'leri birleştirir → status: applied | conflict
 *   5. Client, GET /api/sync/pull ile nihai versiyonu çeker
 *
 * Diff Yapısı (data JSON):
 *   {
 *     entity: "task" | "project" | "column" | "label" | ...,
 *     entityId: "uuid",
 *     action: "create" | "update" | "delete",
 *     field: "title" | null (create/delete için null),
 *     oldValue: any,
 *     newValue: any,
 *   }
 */
const DiffEntry = sequelize.define("DiffEntry", {
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
  client_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: "workspace_clients", key: "id" },
  },
  /**
   * Client'ın bu diff'i oluşturduğu andaki yerel versiyon
   * Conflict detection için kritik
   */
  base_version: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  /**
   * Bu diff'in uygulandığı workspace versiyonu (reconcile sonrası set edilir)
   */
  applied_version: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  /**
   * Diff verisini taşıyan JSON
   */
  data: {
    type: DataTypes.JSONB,
    allowNull: false,
    comment: "{ entity, entityId, action, field, oldValue, newValue }",
  },
  /**
   * Client tarafında diff'in oluşturulma zamanı (offline tolerans)
   */
  client_timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  /**
   * Sunucuya ulaştığı zaman
   */
  server_timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  status: {
    type: DataTypes.ENUM("pending", "applied", "conflict", "rejected"),
    allowNull: false,
    defaultValue: "pending",
  },
  /**
   * Conflict durumunda açıklama
   */
  conflict_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: "diff_entries",
  indexes: [
    { fields: ["workspace_id", "status"] },
    { fields: ["workspace_id", "base_version"] },
    { fields: ["client_id"] },
    { fields: ["server_timestamp"] },
  ],
});

module.exports = DiffEntry;
