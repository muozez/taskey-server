const crypto = require("crypto");
const { generateJoinKey } = require("../utils/keyGenerator");

/**
 * Workspace Model — In-memory store
 *
 * Her workspace şu alanları içerir:
 *   id, name, abbr, color, status, statusText,
 *   metric, usage, members, avatarColors,
 *   server, description, joinKey, createdAt, connectedClients[]
 */

// In-memory workspace store
const workspaces = new Map();

// joinKey → workspaceId hızlı erişim indeksi
const keyIndex = new Map();

// Varsayılan örnek veriler
const SEED_DATA = [
  {
    id: "backend-production",
    name: "Backend Production",
    abbr: "BP",
    color: "indigo",
    status: "online",
    statusText: "Çevrimiçi",
    metric: "CPU Kullanımı",
    usage: 64,
    members: 11,
    avatarColors: ["#a5b4fc", "#86efac", "#fbbf24"],
    server: "Sunucu #1 — EU West",
    description: "",
  },
  {
    id: "staging-env",
    name: "Staging Env",
    abbr: "ST",
    color: "amber",
    status: "online",
    statusText: "Çevrimiçi",
    metric: "Depolama Kullanımı",
    usage: 28,
    members: 3,
    avatarColors: ["#c4b5fd"],
    server: "Sunucu #2 — US East",
    description: "",
  },
  {
    id: "mobile-api",
    name: "Mobile API",
    abbr: "MA",
    color: "rose",
    status: "pending",
    statusText: "Beklemede",
    metric: "CPU Kullanımı",
    usage: 92,
    members: 6,
    avatarColors: ["#fca5a5", "#93c5fd"],
    server: "Sunucu #3 — Asia",
    description: "",
  },
];

function _generateUniqueKey() {
  let key;
  let attempts = 0;
  do {
    key = generateJoinKey();
    attempts++;
    if (attempts > 100) throw new Error("Key üretimi başarısız");
  } while (keyIndex.has(key));
  return key;
}

// Seed verilerini yükle
function seed() {
  for (const data of SEED_DATA) {
    const joinKey = _generateUniqueKey();
    const workspace = {
      ...data,
      joinKey,
      createdAt: new Date().toISOString(),
      connectedClients: [],
    };
    workspaces.set(workspace.id, workspace);
    keyIndex.set(joinKey, workspace.id);
  }
}

// ===== CRUD =====

function getAll() {
  return Array.from(workspaces.values());
}

function getById(id) {
  return workspaces.get(id) || null;
}

function getByJoinKey(key) {
  const upperKey = key.toUpperCase();
  const wsId = keyIndex.get(upperKey);
  if (!wsId) return null;
  return workspaces.get(wsId) || null;
}

function create({ name, server, description }) {
  const id = name.toLowerCase().replace(/\s+/g, "-") + "-" + crypto.randomBytes(3).toString("hex");
  const abbr = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  const colors = ["indigo", "amber", "rose", "green", "blue"];
  const joinKey = _generateUniqueKey();

  const workspace = {
    id,
    name,
    abbr,
    color: colors[workspaces.size % colors.length],
    status: "pending",
    statusText: "Beklemede",
    metric: "CPU Kullanımı",
    usage: 0,
    members: 1,
    avatarColors: ["#a5b4fc"],
    server: server || "",
    description: description || "",
    joinKey,
    createdAt: new Date().toISOString(),
    connectedClients: [],
  };

  workspaces.set(id, workspace);
  keyIndex.set(joinKey, id);
  return workspace;
}

function deleteById(id) {
  const ws = workspaces.get(id);
  if (!ws) return false;
  keyIndex.delete(ws.joinKey);
  workspaces.delete(id);
  return true;
}

function regenerateKey(id) {
  const ws = workspaces.get(id);
  if (!ws) return null;
  // Eski key'i indeksten sil
  keyIndex.delete(ws.joinKey);
  // Yeni key üret
  const newKey = _generateUniqueKey();
  ws.joinKey = newKey;
  keyIndex.set(newKey, id);
  return ws;
}

/**
 * Lokal client'ın join key ile workspace'e bağlanması
 */
function joinWithKey(joinKey, clientInfo) {
  const ws = getByJoinKey(joinKey);
  if (!ws) return null;

  const client = {
    clientId: crypto.randomBytes(16).toString("hex"),
    name: clientInfo.name || "Anonim",
    hostname: clientInfo.hostname || "unknown",
    joinedAt: new Date().toISOString(),
  };

  ws.connectedClients.push(client);
  ws.members = (ws.members || 0) + 1;

  return { workspace: ws, client };
}

// Başlangıçta seed verilerini yükle
seed();

module.exports = {
  getAll,
  getById,
  getByJoinKey,
  create,
  deleteById,
  regenerateKey,
  joinWithKey,
};
