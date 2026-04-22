const express = require("express");
const PredictionLog = require("../models/PredictionLog");
const Machine = require("../models/Machine");
const asyncHandler = require("../utils/asyncHandler");
const { authenticate, allowRoles } = require("../middleware/auth");
const { runtime } = require("../state/runtime");

const router = express.Router();

router.get(
  "/",
  authenticate,
  allowRoles("admin"),
  asyncHandler(async (_req, res) => {
  let totalMachines;
  let totalPredictions;
  let recentPredictions;

  const useDb = runtime.dbReady && !runtime.memoryMode;
  if (!useDb) {
    totalMachines = runtime.machines.length;
    totalPredictions = runtime.predictions.length;
    recentPredictions = [...runtime.predictions]
      .sort((a, b) => new Date(b.predictedAt) - new Date(a.predictedAt))
      .slice(0, 100);
  } else {
    [totalMachines, totalPredictions, recentPredictions] = await Promise.all([
      Machine.countDocuments(),
      PredictionLog.countDocuments(),
      PredictionLog.find().sort({ predictedAt: -1 }).limit(100)
    ]);
  }

  const riskCounts = { Low: 0, Medium: 0, High: 0, Critical: 0 };
  let sumProbability = 0;

  recentPredictions.forEach((item) => {
    if (riskCounts[item.riskLevel] !== undefined) {
      riskCounts[item.riskLevel] += 1;
    }
    sumProbability += item.failureProbability;
  });

  const avgFailureProbability =
    recentPredictions.length > 0 ? sumProbability / recentPredictions.length : 0;

  res.json({
    totalMachines,
    totalPredictions,
    avgFailureProbability,
    riskCounts
  });
  })
);

module.exports = router;
