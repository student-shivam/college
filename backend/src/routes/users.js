const express = require("express");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const { authenticate, allowRoles } = require("../middleware/auth");
const { runtime, newId } = require("../state/runtime");

const router = express.Router();

function sanitizeUser(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl || null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function ensureDir(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (_err) {
    // ignore
  }
}

function safeUnlink(filePath) {
  if (!filePath) return;
  try {
    fs.unlinkSync(filePath);
  } catch (_err) {
    // ignore
  }
}

const uploadsRoot = path.join(__dirname, "..", "..", "uploads");
const avatarsDir = path.join(uploadsRoot, "avatars");
ensureDir(avatarsDir);

const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, avatarsDir),
    filename: (req, file, cb) => {
      const rawExt = path.extname(String(file.originalname || "")).toLowerCase();
      const ext = [".png", ".jpg", ".jpeg", ".webp"].includes(rawExt) ? rawExt : ".png";
      const id = String(req.user?._id || "user");
      cb(null, `${id}-${Date.now()}${ext}`);
    }
  }),
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
  fileFilter: (_req, file, cb) => {
    const ok = String(file.mimetype || "").toLowerCase().startsWith("image/");
    cb(ok ? null : new Error("Only image uploads are allowed"), ok);
  }
});

router.get(
  "/",
  authenticate,
  allowRoles("admin"),
  asyncHandler(async (_req, res) => {
    const useDb = runtime.dbReady && !runtime.memoryMode;
    if (!useDb) {
      const users = runtime.users
        .slice()
        .sort((a, b) => String(a.email).localeCompare(String(b.email)))
        .map(sanitizeUser);
      return res.json(users);
    }

    const users = await User.find().select("-passwordHash").sort({ email: 1 });
    return res.json(users);
  })
);

router.post(
  "/",
  authenticate,
  allowRoles("admin"),
  asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res
        .status(400)
        .json({ message: "name, email, password, role are required" });
    }
    if (!["admin", "user"].includes(role)) {
      return res.status(400).json({ message: "role must be admin or user" });
    }
    if (String(password).length < 6) {
      return res
        .status(400)
        .json({ message: "password must be at least 6 characters" });
    }

    const lowerEmail = String(email).toLowerCase();
    const useDb = runtime.dbReady && !runtime.memoryMode;
    const existing = !useDb
      ? runtime.users.find((item) => item.email === lowerEmail)
      : await User.findOne({ email: lowerEmail });

    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const now = new Date().toISOString();

    let user;
    if (!useDb) {
      user = {
        _id: newId(),
        name: String(name).trim(),
        email: lowerEmail,
        passwordHash,
        role,
        createdAt: now,
        updatedAt: now
      };
      runtime.users.push(user);
      return res.status(201).json(sanitizeUser(user));
    }

    user = await User.create({
      name: String(name).trim(),
      email: lowerEmail,
      passwordHash,
      role
    });
    return res.status(201).json(sanitizeUser(user));
  })
);

router.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user });
  })
);

router.post(
  "/me/avatar",
  authenticate,
  (req, res, next) => {
    avatarUpload.single("avatar")(req, res, (err) => {
      if (!err) return next();
      if (String(err.message || "").toLowerCase().includes("file too large")) {
        return res.status(413).json({ message: "Image too large. Max 3MB." });
      }
      return res.status(400).json({ message: err.message || "Upload failed" });
    });
  },
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "avatar file is required" });

    const publicUrl = `/uploads/avatars/${req.file.filename}`;
    const useDb = runtime.dbReady && !runtime.memoryMode;

    if (!useDb) {
      const index = runtime.users.findIndex((item) => item._id === String(req.user._id));
      if (index === -1) return res.status(404).json({ message: "User not found" });
      const prev = runtime.users[index];
      if (prev?.avatarUrl && String(prev.avatarUrl).startsWith("/uploads/avatars/")) {
        safeUnlink(path.join(uploadsRoot, String(prev.avatarUrl).replace(/^\/uploads\//, "")));
      }
      const updated = { ...prev, avatarUrl: publicUrl, updatedAt: new Date().toISOString() };
      runtime.users[index] = updated;
      return res.json({
        user: {
          _id: updated._id,
          name: updated.name,
          email: updated.email,
          role: updated.role,
          avatarUrl: updated.avatarUrl || null,
          preferences: updated.preferences || undefined
        }
      });
    }

    const existing = await User.findById(req.user._id).select("avatarUrl");
    if (existing?.avatarUrl && String(existing.avatarUrl).startsWith("/uploads/avatars/")) {
      safeUnlink(path.join(uploadsRoot, String(existing.avatarUrl).replace(/^\/uploads\//, "")));
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatarUrl: publicUrl, updatedAt: new Date().toISOString() },
      { new: true }
    ).select("-passwordHash");

    return res.json({ user });
  })
);

router.delete(
  "/me/avatar",
  authenticate,
  asyncHandler(async (req, res) => {
    const useDb = runtime.dbReady && !runtime.memoryMode;

    if (!useDb) {
      const index = runtime.users.findIndex((item) => item._id === String(req.user._id));
      if (index === -1) return res.status(404).json({ message: "User not found" });
      const prev = runtime.users[index];
      if (prev?.avatarUrl && String(prev.avatarUrl).startsWith("/uploads/avatars/")) {
        safeUnlink(path.join(uploadsRoot, String(prev.avatarUrl).replace(/^\/uploads\//, "")));
      }
      const updated = { ...prev, avatarUrl: null, updatedAt: new Date().toISOString() };
      runtime.users[index] = updated;
      return res.json({
        user: {
          _id: updated._id,
          name: updated.name,
          email: updated.email,
          role: updated.role,
          avatarUrl: null,
          preferences: updated.preferences || undefined
        }
      });
    }

    const existing = await User.findById(req.user._id).select("avatarUrl");
    if (existing?.avatarUrl && String(existing.avatarUrl).startsWith("/uploads/avatars/")) {
      safeUnlink(path.join(uploadsRoot, String(existing.avatarUrl).replace(/^\/uploads\//, "")));
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatarUrl: null, updatedAt: new Date().toISOString() },
      { new: true }
    ).select("-passwordHash");

    return res.json({ user });
  })
);

router.patch(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const { name, preferences } = req.body || {};
    if (!name && !preferences) {
      return res.status(400).json({ message: "No fields provided to update" });
    }

    const updates = {};
    if (name) {
      const nextName = String(name).trim();
      if (!nextName) return res.status(400).json({ message: "name cannot be empty" });
      updates.name = nextName;
    }

    function normalizePreferences(input) {
      if (!input || typeof input !== "object") return undefined;
      const out = {};

      if (input.defaultMachineId === null || input.defaultMachineId === "") {
        out.defaultMachineId = null;
      } else if (input.defaultMachineId !== undefined) {
        out.defaultMachineId = String(input.defaultMachineId);
      }

      if (input.autoFillSensors !== undefined) {
        out.autoFillSensors = Boolean(input.autoFillSensors);
      }

      if (input.sensorDefaults && typeof input.sensorDefaults === "object") {
        const sd = input.sensorDefaults;
        const allowed = ["temperature", "vibration", "humidity", "runtimeHours", "pressure"];
        out.sensorDefaults = {};
        for (const key of allowed) {
          if (!Object.prototype.hasOwnProperty.call(sd, key)) continue;

          if (sd[key] === "" || sd[key] === null) {
            out.sensorDefaults[key] = null; // explicit clear
            continue;
          }

          if (sd[key] === undefined) continue;

          const value = Number(sd[key]);
          if (!Number.isFinite(value)) {
            return { error: `${key} must be a valid number` };
          }
          out.sensorDefaults[key] = value;
        }
      }

      return { preferences: out };
    }

    const prefRes = normalizePreferences(preferences);
    if (prefRes && prefRes.error) {
      return res.status(400).json({ message: prefRes.error });
    }

    const useDb = runtime.dbReady && !runtime.memoryMode;
    const now = new Date().toISOString();

    if (!useDb) {
      const index = runtime.users.findIndex((item) => item._id === String(req.user._id));
      if (index === -1) return res.status(404).json({ message: "User not found" });
      const existing = runtime.users[index];
      const updated = { ...existing };
      if (updates.name) updated.name = updates.name;
      if (prefRes?.preferences) {
        updated.preferences = { ...(existing.preferences || {}), ...prefRes.preferences };
        if (updated.preferences.defaultMachineId === null) {
          delete updated.preferences.defaultMachineId;
        }
        if (prefRes.preferences.sensorDefaults && typeof updated.preferences.sensorDefaults === "object") {
          for (const [key, value] of Object.entries(prefRes.preferences.sensorDefaults)) {
            if (value === null) {
              delete updated.preferences.sensorDefaults[key];
            }
          }
        }
      }
      updated.updatedAt = now;
      runtime.users[index] = updated;
      return res.json({
        user: {
          _id: updated._id,
          name: updated.name,
          email: updated.email,
          role: updated.role,
          avatarUrl: updated.avatarUrl || null,
          preferences: updated.preferences || undefined
        }
      });
    }

    const updateDoc = {};
    if (updates.name) updateDoc.name = updates.name;
    if (prefRes?.preferences) {
      if (prefRes.preferences.defaultMachineId === null) {
        updateDoc["preferences.defaultMachineId"] = null;
      } else if (prefRes.preferences.defaultMachineId !== undefined) {
        updateDoc["preferences.defaultMachineId"] = prefRes.preferences.defaultMachineId;
      }
      if (prefRes.preferences.autoFillSensors !== undefined) {
        updateDoc["preferences.autoFillSensors"] = prefRes.preferences.autoFillSensors;
      }
      if (prefRes.preferences.sensorDefaults) {
        for (const [key, value] of Object.entries(prefRes.preferences.sensorDefaults)) {
          if (value === null) {
            updateDoc[`preferences.sensorDefaults.${key}`] = null;
          } else {
            updateDoc[`preferences.sensorDefaults.${key}`] = value;
          }
        }
      }
    }

    updateDoc.updatedAt = now;

    const user = await User.findByIdAndUpdate(req.user._id, updateDoc, { new: true }).select(
      "-passwordHash"
    );
    return res.json({ user });
  })
);

router.post(
  "/me/password",
  authenticate,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "currentPassword and newPassword are required" });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ message: "password must be at least 6 characters" });
    }

    const useDb = runtime.dbReady && !runtime.memoryMode;
    const now = new Date().toISOString();

    if (!useDb) {
      const index = runtime.users.findIndex((item) => item._id === String(req.user._id));
      if (index === -1) return res.status(404).json({ message: "User not found" });
      const user = runtime.users[index];
      const ok = await bcrypt.compare(String(currentPassword), user.passwordHash);
      if (!ok) return res.status(401).json({ message: "Current password is incorrect" });
      const passwordHash = await bcrypt.hash(String(newPassword), 10);
      runtime.users[index] = { ...user, passwordHash, updatedAt: now };
      return res.json({ ok: true });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });
    const ok = await bcrypt.compare(String(currentPassword), user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Current password is incorrect" });
    user.passwordHash = await bcrypt.hash(String(newPassword), 10);
    user.updatedAt = now;
    await user.save();
    return res.json({ ok: true });
  })
);

router.patch(
  "/:id",
  authenticate,
  allowRoles("admin"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, email, role, password } = req.body;
    if (!name && !email && !role && !password) {
      return res.status(400).json({ message: "No fields provided to update" });
    }
    if (role && !["admin", "user"].includes(role)) {
      return res.status(400).json({ message: "role must be admin or user" });
    }
    if (password && String(password).length < 6) {
      return res
        .status(400)
        .json({ message: "password must be at least 6 characters" });
    }

    const useDb = runtime.dbReady && !runtime.memoryMode;
    const now = new Date().toISOString();

    if (!useDb) {
      const index = runtime.users.findIndex((item) => item._id === id);
      if (index === -1) {
        return res.status(404).json({ message: "User not found" });
      }

      const nextEmail = email ? String(email).toLowerCase() : null;
      if (nextEmail) {
        const emailExists = runtime.users.some(
          (item) => item.email === nextEmail && item._id !== id
        );
        if (emailExists) {
          return res.status(409).json({ message: "Email already registered" });
        }
      }

      const existing = runtime.users[index];
      const updated = { ...existing };
      if (name) updated.name = String(name).trim();
      if (nextEmail) updated.email = nextEmail;
      if (role) updated.role = role;
      if (password) {
        updated.passwordHash = await bcrypt.hash(String(password), 10);
      }
      updated.updatedAt = now;
      runtime.users[index] = updated;
      return res.json(sanitizeUser(updated));
    }

    if (email) {
      const lowerEmail = String(email).toLowerCase();
      const conflict = await User.findOne({ email: lowerEmail, _id: { $ne: id } });
      if (conflict) {
        return res.status(409).json({ message: "Email already registered" });
      }
    }

    const update = {};
    if (name) update.name = String(name).trim();
    if (email) update.email = String(email).toLowerCase();
    if (role) update.role = role;
    if (password) update.passwordHash = await bcrypt.hash(String(password), 10);
    update.updatedAt = now;

    const user = await User.findByIdAndUpdate(id, update, { new: true }).select(
      "-passwordHash"
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.json(user);
  })
);

router.delete(
  "/:id",
  authenticate,
  allowRoles("admin"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (String(req.user._id) === String(id)) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }

    const useDb = runtime.dbReady && !runtime.memoryMode;
    if (!useDb) {
      const index = runtime.users.findIndex((item) => item._id === id);
      if (index === -1) {
        return res.status(404).json({ message: "User not found" });
      }
      runtime.users.splice(index, 1);
      return res.json({ ok: true });
    }

    const deleted = await User.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.json({ ok: true });
  })
);

module.exports = router;
