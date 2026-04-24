const express = require("express");
const PredictionLog = require("../models/PredictionLog");
const Machine = require("../models/Machine");
const asyncHandler = require("../utils/asyncHandler");
const { authenticate, allowRoles } = require("../middleware/auth");
const { runtime } = require("../state/runtime");
const { loadAdminOverview, loadUserOverview } = require("../controllers/dashboardController");

const router = express.Router();

router.get(
  "/admin/overview",
  authenticate,
  allowRoles("admin"),
  asyncHandler(async (req, res) => {
    const days = req.query.days;
    const alertLimit = req.query.alertLimit;
    const topLimit = req.query.topLimit;
    const data = await loadAdminOverview({ days, alertLimit, topLimit });
    res.json(data);
  })
);

router.get(
  "/me/overview",
  authenticate,
  asyncHandler(async (req, res) => {
    const days = req.query.days;
    const alertLimit = req.query.alertLimit;
    const topLimit = req.query.topLimit;
    const data = await loadUserOverview(req.user, { days, alertLimit, topLimit });
    res.json(data);
  })
);

function startSse(res) {
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }
}

router.get("/admin/stream", authenticate, allowRoles("admin"), async (req, res) => {
  startSse(res);

  let closed = false;
  const intervalMs = Math.min(Math.max(Number(req.query.intervalMs) || 2500, 750), 10000);

  async function sendSnapshot() {
    if (closed) return;
    try {
      const data = await loadAdminOverview({
        days: req.query.days,
        alertLimit: req.query.alertLimit,
        topLimit: req.query.topLimit
      });
      res.write(`event: snapshot\ndata: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
      res.write(
        `event: error\ndata: ${JSON.stringify({ message: err.message || "stream error" })}\n\n`
      );
    }
  }

  const tick = setInterval(sendSnapshot, intervalMs);
  const ping = setInterval(() => {
    if (closed) return;
    res.write(": ping\n\n");
  }, 15000);

  await sendSnapshot();

  req.on("close", () => {
    closed = true;
    clearInterval(tick);
    clearInterval(ping);
    res.end();
  });
});

router.get("/me/stream", authenticate, async (req, res) => {
  startSse(res);

  let closed = false;
  const intervalMs = Math.min(Math.max(Number(req.query.intervalMs) || 2500, 750), 10000);

  async function sendSnapshot() {
    if (closed) return;
    try {
      const data = await loadUserOverview(req.user, {
        days: req.query.days,
        alertLimit: req.query.alertLimit,
        topLimit: req.query.topLimit
      });
      res.write(`event: snapshot\ndata: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
      res.write(
        `event: error\ndata: ${JSON.stringify({ message: err.message || "stream error" })}\n\n`
      );
    }
  }

  const tick = setInterval(sendSnapshot, intervalMs);
  const ping = setInterval(() => {
    if (closed) return;
    res.write(": ping\n\n");
  }, 15000);

  await sendSnapshot();

  req.on("close", () => {
    closed = true;
    clearInterval(tick);
    clearInterval(ping);
    res.end();
  });
});

router.get(
  "/",
  authenticate,
  allowRoles("admin"),
  asyncHandler(async (_req, res) => {
  let totalMachines;
  let totalPredictions;
  let recentPredictions;
  let lastPrediction;

  const useDb = runtime.dbReady && !runtime.memoryMode;
  if (!useDb) {
    totalMachines = runtime.machines.length;
    totalPredictions = runtime.predictions.length;
    recentPredictions = [...runtime.predictions]
      .sort((a, b) => new Date(b.predictedAt) - new Date(a.predictedAt))
      .slice(0, 100);
    lastPrediction = recentPredictions[0] || null;
  } else {
    [totalMachines, totalPredictions, recentPredictions] = await Promise.all([
      Machine.countDocuments(),
      PredictionLog.countDocuments(),
      PredictionLog.find().sort({ predictedAt: -1 }).limit(100)
    ]);
    lastPrediction = recentPredictions[0] || null;
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
    riskCounts,
    lastPrediction
  });
  })
);

router.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
  let totalMachines;
  let totalPredictions;
  let recentPredictions;
  let lastPrediction;

  const useDb = runtime.dbReady && !runtime.memoryMode;
  if (!useDb) {
    totalMachines = runtime.machines.length;
    const mine = runtime.predictions.filter((item) => item.createdBy?._id === req.user._id);
    totalPredictions = mine.length;
    recentPredictions = [...mine]
      .sort((a, b) => new Date(b.predictedAt) - new Date(a.predictedAt))
      .slice(0, 100);
    lastPrediction = recentPredictions[0] || null;
  } else {
    [totalMachines, totalPredictions, recentPredictions] = await Promise.all([
      Machine.countDocuments(),
      PredictionLog.countDocuments({ createdBy: req.user._id }),
      PredictionLog.find({ createdBy: req.user._id })
        .populate("machine")
        .sort({ predictedAt: -1 })
        .limit(100)
        .lean()
    ]);
    lastPrediction = recentPredictions[0] || null;
  }

  const riskCounts = { Low: 0, Medium: 0, High: 0, Critical: 0 };
  let sumProbability = 0;

  recentPredictions.forEach((item) => {
    if (riskCounts[item.riskLevel] !== undefined) {
      riskCounts[item.riskLevel] += 1;
    }
    sumProbability += item.failureProbability || 0;
  });

  const avgFailureProbability =
    recentPredictions.length > 0 ? sumProbability / recentPredictions.length : 0;

  res.json({
    totalMachines,
    totalPredictions,
    avgFailureProbability,
    riskCounts,
    lastPrediction
  });
  })
);

module.exports = router;
