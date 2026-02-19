const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

/**
 * Sync Snapshot — Reconcile edilen workspace durumunun tam kaydı
 *
 * Her reconcile sonrası yeni bir snapshot oluşturulur.
 * Client'lar pull yaptığında en güncel snapshot'ı alır.
 * Eski snapshot'lar audit trail ve rollback için saklanır.
 */
const SyncSnapshot = sequelize.define("SyncSnapshot", {
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
  /**
   * Workspace versiyon numarası — her reconcile'da artar
   */
  version: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  /**
   * Workspace'in bu versiyondaki tam durumu (JSONB)
   * Tüm entity'lerin güncel halleri
   */
  data: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
    comment: "{ tasks: [...], projects: [...], columns: [...], ... }",
  },
  /**
   * Bu snapshot'ı oluşturan reconcile'da uygulanan diff id'leri
   */
  applied_diff_ids: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
  },
  /**
   * Snapshot özeti — ne değişti
   */
  summary: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: "sync_snapshots",
  indexes: [
    { unique: true, fields: ["workspace_id", "version"] },
    { fields: ["workspace_id"] },
  ],
});

module.exports = SyncSnapshot;
