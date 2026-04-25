const bcrypt = require("bcryptjs");

const User = require("../models/User");
const { runtime, newId } = require("../state/runtime");

async function ensureDevAdmin() {
  const shouldSeed =
    process.env.NODE_ENV !== "production" && String(process.env.SEED_ADMIN || "true") !== "false";
  if (!shouldSeed) return;

  const email = String(process.env.SEED_ADMIN_EMAIL || "admin@pm.local").toLowerCase();
  const password = String(process.env.SEED_ADMIN_PASSWORD || "admin123");
  const name = String(process.env.SEED_ADMIN_NAME || "Admin");

  const useDb = runtime.dbReady && !runtime.memoryMode;
  if (!useDb) {
    const existing = runtime.users.find((u) => u.email === email);
    if (existing) return;
    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();
    runtime.users.push({
      _id: newId(),
      name,
      email,
      passwordHash,
      role: "admin",
      avatarUrl: null,
      createdAt: now,
      updatedAt: now
    });
    console.log(`Seeded dev admin (memory): ${email} / ${password}`);
    return;
  }

  const existing = await User.findOne({ email });
  if (existing) return;

  const passwordHash = await bcrypt.hash(password, 10);
  await User.create({ name, email, passwordHash, role: "admin" });
  console.log(`Seeded dev admin (mongo): ${email} / ${password}`);
}

module.exports = { ensureDevAdmin };
