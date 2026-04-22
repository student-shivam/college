const express = require("express");
const Machine = require("../models/Machine");
const asyncHandler = require("../utils/asyncHandler");
const { authenticate, allowRoles } = require("../middleware/auth");
const { runtime, newId } = require("../state/runtime");

const router = express.Router();

router.get(
  "/",
  authenticate,
  asyncHandler(async (_req, res) => {
  const useDb = runtime.dbReady && !runtime.memoryMode;
  const machines = !useDb
    ? [...runtime.machines].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    : await Machine.find().sort({ createdAt: -1 });

  res.json(machines);
  })
);

router.post(
  "/",
  authenticate,
  allowRoles("admin"),
  asyncHandler(async (req, res) => {
  const { name, location, modelNumber, installedAt } = req.body;
  if (!name) {
    return res.status(400).json({ message: "name is required" });
  }

  const useDb = runtime.dbReady && !runtime.memoryMode;
  if (!useDb) {
    const exists = runtime.machines.find(
      (item) => item.name.toLowerCase() === String(name).toLowerCase()
    );
    if (exists) {
      return res.status(409).json({ message: "Machine name already exists" });
    }

    const now = new Date().toISOString();
    const machine = {
      _id: newId(),
      name,
      location: location || "Unknown",
      modelNumber: modelNumber || "N/A",
      installedAt: installedAt || now,
      createdAt: now,
      updatedAt: now
    };
    runtime.machines.push(machine);
    return res.status(201).json(machine);
  }

  try {
    const machine = await Machine.create({
      name,
      location,
      modelNumber,
      installedAt
    });
    return res.status(201).json(machine);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "Machine name already exists" });
    }
    throw err;
  }
  })
);

module.exports = router;
