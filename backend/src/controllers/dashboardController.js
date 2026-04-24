const mongoose = require("mongoose");

const Machine = require("../models/Machine");
const PredictionLog = require("../models/PredictionLog");
const AlertEvent = require("../models/AlertEvent");
const { runtime } = require("../state/runtime");

function riskToStatus(riskLevel) {
  const level = String(riskLevel || "").toLowerCase();
  if (level === "low") return "Healthy";
  if (level === "medium") return "Warning";
  if (level === "high" || level === "critical") return "Critical";
  return "Unknown";
}

function toDateKey(input) {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function buildDaySeries(days) {
  const now = new Date();
  const out = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = toDateKey(d);
    out.push({
      date: key,
      Healthy: 0,
      Warning: 0,
      Critical: 0
    });
  }
  return out;
}

function statusWeight(status) {
  if (status === "Critical") return 3;
  if (status === "Warning") return 2;
  if (status === "Healthy") return 1;
  return 0;
}

function trendArrow(prevProb, nextProb) {
  if (!Number.isFinite(prevProb) || !Number.isFinite(nextProb)) return "flat";
  const diff = nextProb - prevProb;
  if (diff > 0.02) return "up";
  if (diff < -0.02) return "down";
  return "flat";
}

async function loadAdminOverview({ days = 7, alertLimit = 6, topLimit = 6 } = {}) {
  const useDb = runtime.dbReady && !runtime.memoryMode;
  const safeDays = Math.min(Math.max(Number(days) || 7, 1), 30);
  const safeAlertLimit = Math.min(Math.max(Number(alertLimit) || 6, 1), 20);
  const safeTopLimit = Math.min(Math.max(Number(topLimit) || 6, 1), 25);

  if (!useDb) {
    const totalMachines = runtime.machines.length;
    const predictions = [...runtime.predictions].sort(
      (a, b) => new Date(b.predictedAt) - new Date(a.predictedAt)
    );

    const latestByMachine = new Map();
    const lastTwoByMachine = new Map();
    predictions.forEach((p) => {
      const machineId = p.machine?._id ? String(p.machine._id) : null;
      if (!machineId) return;
      if (!latestByMachine.has(machineId)) {
        latestByMachine.set(machineId, p);
      }
      const list = lastTwoByMachine.get(machineId) || [];
      if (list.length < 2) {
        list.push(p);
        lastTwoByMachine.set(machineId, list);
      }
    });

    const machineRows = [...latestByMachine.values()].map((p) => {
      const status = riskToStatus(p.riskLevel);
      return {
        machineId: p.machine?._id ? String(p.machine._id) : null,
        name: p.machine?.name || "Unknown",
        status,
        riskLevel: p.riskLevel || null,
        failureProbability: p.failureProbability ?? null,
        predictedAt: p.predictedAt || null,
        sensorData: p.sensorData || null
      };
    });

    const distribution = { Healthy: 0, Warning: 0, Critical: 0, Unknown: 0 };
    machineRows.forEach((row) => {
      distribution[row.status] = (distribution[row.status] || 0) + 1;
    });

    const trend = buildDaySeries(safeDays);
    const dayMap = new Map(trend.map((d) => [d.date, d]));
    const from = new Date();
    from.setDate(from.getDate() - (safeDays - 1));
    predictions.forEach((p) => {
      const t = new Date(p.predictedAt);
      if (Number.isNaN(t.getTime()) || t < from) return;
      const key = toDateKey(t);
      const bucket = key ? dayMap.get(key) : null;
      if (!bucket) return;
      const status = riskToStatus(p.riskLevel);
      if (!bucket[status] && bucket[status] !== 0) return;
      bucket[status] += 1;
    });

    const recentAlerts = [...runtime.alertEvents]
      .sort((a, b) => new Date(b.triggeredAt) - new Date(a.triggeredAt))
      .slice(0, safeAlertLimit)
      .map((evt) => ({
        _id: evt._id,
        severity: evt.severity,
        message: evt.message,
        machine: evt.machine || null,
        triggeredAt: evt.triggeredAt
      }));

    const topAtRisk = machineRows
      .slice()
      .sort((a, b) => {
        const sw = statusWeight(b.status) - statusWeight(a.status);
        if (sw !== 0) return sw;
        return (b.failureProbability || 0) - (a.failureProbability || 0);
      })
      .slice(0, safeTopLimit)
      .map((row) => {
        const lastTwo = lastTwoByMachine.get(String(row.machineId)) || [];
        const prev = lastTwo[1]?.failureProbability;
        const next = lastTwo[0]?.failureProbability;
        return { ...row, trend: trendArrow(prev, next) };
      });

    return {
      scope: "admin",
      now: new Date().toISOString(),
      cards: {
        totalMachines,
        Healthy: distribution.Healthy || 0,
        Warning: distribution.Warning || 0,
        Critical: distribution.Critical || 0
      },
      distribution,
      trend,
      recentAlerts,
      topAtRisk
    };
  }

  const totalMachines = await Machine.countDocuments();

  const latestAgg = await PredictionLog.aggregate([
    { $match: { machine: { $ne: null } } },
    { $sort: { predictedAt: -1 } },
    {
      $group: {
        _id: "$machine",
        predictedAt: { $first: "$predictedAt" },
        riskLevel: { $first: "$riskLevel" },
        failureProbability: { $first: "$failureProbability" },
        sensorData: { $first: "$sensorData" }
      }
    }
  ]);

  const machineIds = latestAgg.map((r) => r._id).filter(Boolean);
  const machines = await Machine.find({ _id: { $in: machineIds } })
    .select("name")
    .lean();
  const machineNameById = new Map(machines.map((m) => [String(m._id), m.name]));

  const machineRows = latestAgg.map((row) => {
    const machineId = String(row._id);
    const status = riskToStatus(row.riskLevel);
    return {
      machineId,
      name: machineNameById.get(machineId) || "Unknown",
      status,
      riskLevel: row.riskLevel || null,
      failureProbability: row.failureProbability ?? null,
      predictedAt: row.predictedAt || null,
      sensorData: row.sensorData || null
    };
  });

  const distribution = { Healthy: 0, Warning: 0, Critical: 0, Unknown: 0 };
  machineRows.forEach((row) => {
    distribution[row.status] = (distribution[row.status] || 0) + 1;
  });

  const trend = buildDaySeries(safeDays);
  const dayMap = new Map(trend.map((d) => [d.date, d]));
  const from = new Date();
  from.setDate(from.getDate() - (safeDays - 1));
  const trendAgg = await PredictionLog.aggregate([
    { $match: { predictedAt: { $gte: from } } },
    {
      $project: {
        day: { $dateToString: { format: "%Y-%m-%d", date: "$predictedAt" } },
        riskLevel: "$riskLevel"
      }
    }
  ]);
  trendAgg.forEach((row) => {
    const bucket = dayMap.get(row.day);
    if (!bucket) return;
    const status = riskToStatus(row.riskLevel);
    if (!bucket[status] && bucket[status] !== 0) return;
    bucket[status] += 1;
  });

  const recentAlertsDocs = await AlertEvent.find()
    .sort({ triggeredAt: -1 })
    .limit(safeAlertLimit)
    .lean();
  const recentAlerts = recentAlertsDocs.map((evt) => ({
    _id: String(evt._id),
    severity: evt.severity,
    message: evt.message,
    machine: evt.machine || null,
    triggeredAt: evt.triggeredAt
  }));

  // Compute "trend" arrow from last 2 predictions per machine (best-effort).
  const twoAgg = await PredictionLog.aggregate([
    { $match: { machine: { $ne: null } } },
    { $sort: { predictedAt: -1 } },
    {
      $group: {
        _id: "$machine",
        probs: { $push: "$failureProbability" }
      }
    },
    { $project: { probs: { $slice: ["$probs", 2] } } }
  ]);
  const trendByMachineId = new Map(
    twoAgg.map((row) => {
      const machineId = String(row._id);
      const next = row.probs?.[0];
      const prev = row.probs?.[1];
      return [machineId, trendArrow(prev, next)];
    })
  );

  const topAtRisk = machineRows
    .slice()
    .sort((a, b) => {
      const sw = statusWeight(b.status) - statusWeight(a.status);
      if (sw !== 0) return sw;
      return (b.failureProbability || 0) - (a.failureProbability || 0);
    })
    .slice(0, safeTopLimit)
    .map((row) => ({ ...row, trend: trendByMachineId.get(row.machineId) || "flat" }));

  return {
    scope: "admin",
    now: new Date().toISOString(),
    cards: {
      totalMachines,
      Healthy: distribution.Healthy || 0,
      Warning: distribution.Warning || 0,
      Critical: distribution.Critical || 0
    },
    distribution,
    trend,
    recentAlerts,
    topAtRisk
  };
}

async function loadUserOverview(
  user,
  { days = 7, alertLimit = 6, topLimit = 6 } = {}
) {
  const useDb = runtime.dbReady && !runtime.memoryMode;
  const safeDays = Math.min(Math.max(Number(days) || 7, 1), 30);
  const safeAlertLimit = Math.min(Math.max(Number(alertLimit) || 6, 1), 20);
  const safeTopLimit = Math.min(Math.max(Number(topLimit) || 6, 1), 25);

  if (!user?._id) {
    return {
      scope: "user",
      now: new Date().toISOString(),
      cards: { trackedMachines: 0, Healthy: 0, Warning: 0, Critical: 0 },
      distribution: { Healthy: 0, Warning: 0, Critical: 0, Unknown: 0 },
      trend: buildDaySeries(safeDays),
      recentAlerts: [],
      topAtRisk: []
    };
  }

  if (!useDb) {
    const predictions = runtime.predictions
      .filter((p) => p.createdBy?._id === user._id)
      .sort((a, b) => new Date(b.predictedAt) - new Date(a.predictedAt));

    const latestByMachine = new Map();
    const lastTwoByMachine = new Map();
    predictions.forEach((p) => {
      const machineId = p.machine?._id ? String(p.machine._id) : null;
      if (!machineId) return;
      if (!latestByMachine.has(machineId)) {
        latestByMachine.set(machineId, p);
      }
      const list = lastTwoByMachine.get(machineId) || [];
      if (list.length < 2) {
        list.push(p);
        lastTwoByMachine.set(machineId, list);
      }
    });

    const machineRows = [...latestByMachine.values()].map((p) => {
      const status = riskToStatus(p.riskLevel);
      return {
        machineId: p.machine?._id ? String(p.machine._id) : null,
        name: p.machine?.name || "Unknown",
        status,
        riskLevel: p.riskLevel || null,
        failureProbability: p.failureProbability ?? null,
        predictedAt: p.predictedAt || null,
        sensorData: p.sensorData || null
      };
    });

    const distribution = { Healthy: 0, Warning: 0, Critical: 0, Unknown: 0 };
    machineRows.forEach((row) => {
      distribution[row.status] = (distribution[row.status] || 0) + 1;
    });

    const trend = buildDaySeries(safeDays);
    const dayMap = new Map(trend.map((d) => [d.date, d]));
    const from = new Date();
    from.setDate(from.getDate() - (safeDays - 1));
    predictions.forEach((p) => {
      const t = new Date(p.predictedAt);
      if (Number.isNaN(t.getTime()) || t < from) return;
      const key = toDateKey(t);
      const bucket = key ? dayMap.get(key) : null;
      if (!bucket) return;
      const status = riskToStatus(p.riskLevel);
      if (!bucket[status] && bucket[status] !== 0) return;
      bucket[status] += 1;
    });

    const recentAlerts = runtime.alertEvents
      .filter((evt) => String(evt.createdBy?.id || "") === String(user._id))
      .sort((a, b) => new Date(b.triggeredAt) - new Date(a.triggeredAt))
      .slice(0, safeAlertLimit)
      .map((evt) => ({
        _id: evt._id,
        severity: evt.severity,
        message: evt.message,
        machine: evt.machine || null,
        triggeredAt: evt.triggeredAt
      }));

    const topAtRisk = machineRows
      .slice()
      .sort((a, b) => {
        const sw = statusWeight(b.status) - statusWeight(a.status);
        if (sw !== 0) return sw;
        return (b.failureProbability || 0) - (a.failureProbability || 0);
      })
      .slice(0, safeTopLimit)
      .map((row) => {
        const lastTwo = lastTwoByMachine.get(String(row.machineId)) || [];
        const prev = lastTwo[1]?.failureProbability;
        const next = lastTwo[0]?.failureProbability;
        return { ...row, trend: trendArrow(prev, next) };
      });

    return {
      scope: "user",
      now: new Date().toISOString(),
      cards: {
        trackedMachines: machineRows.length,
        Healthy: distribution.Healthy || 0,
        Warning: distribution.Warning || 0,
        Critical: distribution.Critical || 0
      },
      distribution,
      trend,
      recentAlerts,
      topAtRisk
    };
  }

  const userId = new mongoose.Types.ObjectId(String(user._id));

  const latestAgg = await PredictionLog.aggregate([
    { $match: { machine: { $ne: null }, createdBy: userId } },
    { $sort: { predictedAt: -1 } },
    {
      $group: {
        _id: "$machine",
        predictedAt: { $first: "$predictedAt" },
        riskLevel: { $first: "$riskLevel" },
        failureProbability: { $first: "$failureProbability" },
        sensorData: { $first: "$sensorData" }
      }
    }
  ]);

  const machineIds = latestAgg.map((r) => r._id).filter(Boolean);
  const machines = await Machine.find({ _id: { $in: machineIds } })
    .select("name")
    .lean();
  const machineNameById = new Map(machines.map((m) => [String(m._id), m.name]));

  const machineRows = latestAgg.map((row) => {
    const machineId = String(row._id);
    const status = riskToStatus(row.riskLevel);
    return {
      machineId,
      name: machineNameById.get(machineId) || "Unknown",
      status,
      riskLevel: row.riskLevel || null,
      failureProbability: row.failureProbability ?? null,
      predictedAt: row.predictedAt || null,
      sensorData: row.sensorData || null
    };
  });

  const distribution = { Healthy: 0, Warning: 0, Critical: 0, Unknown: 0 };
  machineRows.forEach((row) => {
    distribution[row.status] = (distribution[row.status] || 0) + 1;
  });

  const trend = buildDaySeries(safeDays);
  const dayMap = new Map(trend.map((d) => [d.date, d]));
  const from = new Date();
  from.setDate(from.getDate() - (safeDays - 1));
  const trendAgg = await PredictionLog.aggregate([
    { $match: { predictedAt: { $gte: from }, createdBy: userId } },
    {
      $project: {
        day: { $dateToString: { format: "%Y-%m-%d", date: "$predictedAt" } },
        riskLevel: "$riskLevel"
      }
    }
  ]);
  trendAgg.forEach((row) => {
    const bucket = dayMap.get(row.day);
    if (!bucket) return;
    const status = riskToStatus(row.riskLevel);
    if (!bucket[status] && bucket[status] !== 0) return;
    bucket[status] += 1;
  });

  const recentAlertsDocs = await AlertEvent.find({ "createdBy.id": String(user._id) })
    .sort({ triggeredAt: -1 })
    .limit(safeAlertLimit)
    .lean();
  const recentAlerts = recentAlertsDocs.map((evt) => ({
    _id: String(evt._id),
    severity: evt.severity,
    message: evt.message,
    machine: evt.machine || null,
    triggeredAt: evt.triggeredAt
  }));

  const twoAgg = await PredictionLog.aggregate([
    { $match: { machine: { $ne: null }, createdBy: userId } },
    { $sort: { predictedAt: -1 } },
    {
      $group: {
        _id: "$machine",
        probs: { $push: "$failureProbability" }
      }
    },
    { $project: { probs: { $slice: ["$probs", 2] } } }
  ]);
  const trendByMachineId = new Map(
    twoAgg.map((row) => {
      const machineId = String(row._id);
      const next = row.probs?.[0];
      const prev = row.probs?.[1];
      return [machineId, trendArrow(prev, next)];
    })
  );

  const topAtRisk = machineRows
    .slice()
    .sort((a, b) => {
      const sw = statusWeight(b.status) - statusWeight(a.status);
      if (sw !== 0) return sw;
      return (b.failureProbability || 0) - (a.failureProbability || 0);
    })
    .slice(0, safeTopLimit)
    .map((row) => ({ ...row, trend: trendByMachineId.get(row.machineId) || "flat" }));

  return {
    scope: "user",
    now: new Date().toISOString(),
    cards: {
      trackedMachines: machineRows.length,
      Healthy: distribution.Healthy || 0,
      Warning: distribution.Warning || 0,
      Critical: distribution.Critical || 0
    },
    distribution,
    trend,
    recentAlerts,
    topAtRisk
  };
}

module.exports = { loadAdminOverview, loadUserOverview };

