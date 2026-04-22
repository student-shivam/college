const express = require("express");
const bcrypt = require("bcryptjs");

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
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

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

