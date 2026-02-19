const { User, Workspace } = require("../models/index");
const { generateJoinKey } = require("../utils/keyGenerator");

const SEED_USERS = [
  { email: "admin@taskey.com", password: "123456", name: "Muhammet", role: "Yönetici" },
];

const SEED_WORKSPACES = [
  { name: "Backend Production", abbr: "BP", color: "indigo", status: "online", server: "Sunucu #1 — EU West", description: "" },
  { name: "Staging Env", abbr: "ST", color: "amber", status: "online", server: "Sunucu #2 — US East", description: "" },
  { name: "Mobile API", abbr: "MA", color: "rose", status: "pending", server: "Sunucu #3 — Asia", description: "" },
];

async function seedDatabase() {
  try {
    // Users
    for (const userData of SEED_USERS) {
      const [user, created] = await User.findOrCreate({
        where: { email: userData.email },
        defaults: userData,
      });
      if (created) console.log(`[Seed] Kullanıcı oluşturuldu: ${user.email}`);

      // Workspaces
      for (const wsData of SEED_WORKSPACES) {
        const [ws, wsCreated] = await Workspace.findOrCreate({
          where: { name: wsData.name, owner_id: user.id },
          defaults: {
            ...wsData,
            join_key: generateJoinKey(),
            owner_id: user.id,
          },
        });
        if (wsCreated) console.log(`[Seed] Workspace oluşturuldu: ${ws.name} (key: ${ws.join_key})`);
      }
    }
    console.log("[Seed] Seed işlemi tamamlandı");
  } catch (err) {
    console.error("[Seed] Hata:", err.message);
  }
}

module.exports = { seedDatabase };
