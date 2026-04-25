const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const { authenticate } = require("../middleware/auth");
const { runtime, newId } = require("../state/runtime");

const router = express.Router();

function createToken(userId) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return jwt.sign({ userId }, secret, { expiresIn: "7d" });
}

router.post(
  "/signup",
  asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "name, email, password, role are required" });
    }
    if (!["admin", "user"].includes(role)) {
      return res.status(400).json({ message: "role must be admin or user" });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ message: "password must be at least 6 characters" });
    }

    const lowerEmail = email.toLowerCase();
    const useDb = runtime.dbReady && !runtime.memoryMode;
    const existing = !useDb
      ? runtime.users.find((item) => item.email === lowerEmail)
      : await User.findOne({ email: lowerEmail });

    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    let user;
    if (!useDb) {
      const now = new Date().toISOString();
      user = {
        _id: newId(),
        name: name.trim(),
        email: lowerEmail,
        passwordHash,
        role,
        createdAt: now,
        updatedAt: now
      };
      runtime.users.push(user);
    } else {
      user = await User.create({
        name: name.trim(),
        email: lowerEmail,
        passwordHash,
        role
      });
    }

    const token = createToken(user._id);
    return res.status(201).json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl || null
      }
    });
  })
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const lowerEmail = email.toLowerCase();
    const useDb = runtime.dbReady && !runtime.memoryMode;
    const user = !useDb
      ? runtime.users.find((item) => item.email === lowerEmail)
      : await User.findOne({ email: lowerEmail });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (role && user.role !== role) {
      return res.status(403).json({ message: `Selected role does not match account role (${user.role})` });
    }

    const token = createToken(user._id);
    return res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl || null
      }
    });
  })
);

router.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user });
  })
);

module.exports = router;
