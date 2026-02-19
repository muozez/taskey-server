const User = require("./User");
const Workspace = require("./Workspace");
const WorkspaceClient = require("./WorkspaceClient");
const DiffEntry = require("./DiffEntry");
const SyncSnapshot = require("./SyncSnapshot");

// ===== Associations =====

// User → Workspace (1:N)
User.hasMany(Workspace, { foreignKey: "owner_id", as: "workspaces" });
Workspace.belongsTo(User, { foreignKey: "owner_id", as: "owner" });

// Workspace → WorkspaceClient (1:N)
Workspace.hasMany(WorkspaceClient, { foreignKey: "workspace_id", as: "clients" });
WorkspaceClient.belongsTo(Workspace, { foreignKey: "workspace_id", as: "workspace" });

// Workspace → DiffEntry (1:N)
Workspace.hasMany(DiffEntry, { foreignKey: "workspace_id", as: "diffs" });
DiffEntry.belongsTo(Workspace, { foreignKey: "workspace_id", as: "workspace" });

// WorkspaceClient → DiffEntry (1:N)
WorkspaceClient.hasMany(DiffEntry, { foreignKey: "client_id", as: "diffs" });
DiffEntry.belongsTo(WorkspaceClient, { foreignKey: "client_id", as: "client" });

// Workspace → SyncSnapshot (1:N)
Workspace.hasMany(SyncSnapshot, { foreignKey: "workspace_id", as: "snapshots" });
SyncSnapshot.belongsTo(Workspace, { foreignKey: "workspace_id", as: "workspace" });

module.exports = {
  User,
  Workspace,
  WorkspaceClient,
  DiffEntry,
  SyncSnapshot,
};
