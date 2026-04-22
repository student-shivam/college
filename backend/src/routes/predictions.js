const express = require("express");

const Machine = require("../models/Machine");
const PredictionLog = require("../models/PredictionLog");
const { getPrediction } = require("../services/mlService");
const { localPredict } = require("../services/localPredictor");
const { evaluateRules } = require("../services/alertEngine");
const AlertRule = require("../models/AlertRule");
const AlertEvent = require("../models/AlertEvent");
const asyncHandler = require("../utils/asyncHandler");
const { authenticate } = require("../middleware/auth");
const { runtime, newId } = require("../state/runtime");

const router = express.Router();

const requiredFields = [
  "temperature",
  "vibration",
  "pressure",
  "humidity",
  "rpm",
  "voltage",
  "current",
  "runtimeHours",
  "errorCount",
  "maintenanceLagDays"
];

function normalizeSensorData(body) {
  const sensorData = {};
  for (const field of requiredFields) {
    const value = Number(body[field]);
    if (!Number.isFinite(value)) {
      return { error: `${field} must be a valid number` };
    }
    sensorData[field] = value;
  }
  return { sensorData };
}

router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  let logs;
  const useDb = runtime.dbReady && !runtime.memoryMode;
  if (!useDb) {
    const source =
      req.user.role === "admin"
        ? runtime.predictions
        : runtime.predictions.filter((item) => item.createdBy?._id === req.user._id);
    logs = [...source]
      .sort((a, b) => new Date(b.predictedAt) - new Date(a.predictedAt))
      .slice(0, limit);
  } else {
    const query = req.user.role === "admin" ? {} : { createdBy: req.user._id };
    logs = await PredictionLog.find(query)
      .populate("machine")
      .populate("createdBy", "name email role")
      .sort({ predictedAt: -1 })
      .limit(limit);
  }
  res.json(logs);
  })
);

router.post(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
  const { machineId } = req.body;
  const { sensorData, error } = normalizeSensorData(req.body);

  if (error) {
    return res.status(400).json({ message: error });
  }

  let machine = null;
  if (machineId) {
    const useDb = runtime.dbReady && !runtime.memoryMode;
    machine = !useDb
      ? runtime.machines.find((item) => item._id === machineId)
      : await Machine.findById(machineId);

    if (!machine) {
      return res.status(404).json({ message: "Machine not found" });
    }
  }

  const mlPayload = {
    temperature: sensorData.temperature,
    vibration: sensorData.vibration,
    pressure: sensorData.pressure,
    humidity: sensorData.humidity,
    rpm: sensorData.rpm,
    voltage: sensorData.voltage,
    current: sensorData.current,
    runtime_hours: sensorData.runtimeHours,
    error_count: sensorData.errorCount,
    maintenance_lag_days: sensorData.maintenanceLagDays
  };

  let prediction;
  try {
    prediction = await getPrediction(mlPayload);
  } catch (err) {
    // Keep the app working even if ml-api is down.
    prediction = localPredict(mlPayload);
  }

  const useDb = runtime.dbReady && !runtime.memoryMode;
  if (!useDb) {
    const now = new Date().toISOString();
    const savedLog = {
      _id: newId(),
      machine: machine
        ? {
            _id: machine._id,
            name: machine.name,
            location: machine.location,
            modelNumber: machine.modelNumber
          }
        : null,
      createdBy: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role
      },
      sensorData,
      failureProbability: prediction.failure_probability,
      riskLevel: prediction.risk_level,
      recommendation: prediction.recommendation,
      modelVersion: prediction.model_version,
      predictedAt: now,
      createdAt: now,
      updatedAt: now
    };
    runtime.predictions.push(savedLog);

    const hits = evaluateRules(runtime.alertRules, savedLog);
    if (hits.length) {
      hits.forEach((hit) => {
        runtime.alertEvents.push({
          _id: newId(),
          severity: hit.severity,
          rule: hit.rule,
          machine: savedLog.machine ? { id: savedLog.machine._id, name: savedLog.machine.name } : null,
          createdBy: savedLog.createdBy
            ? { id: savedLog.createdBy._id, name: savedLog.createdBy.name, role: savedLog.createdBy.role }
            : null,
          predictionId: savedLog._id,
          snapshot: {
            failureProbability: savedLog.failureProbability,
            riskLevel: savedLog.riskLevel,
            sensorData: savedLog.sensorData
          },
          message: hit.message,
          triggeredAt: now,
          createdAt: now,
          updatedAt: now
        });
      });
    }
    return res.status(201).json(savedLog);
  }

  const savedLog = await PredictionLog.create({
    machine: machine ? machine._id : undefined,
    createdBy: req.user._id,
    sensorData,
    failureProbability: prediction.failure_probability,
    riskLevel: prediction.risk_level,
    recommendation: prediction.recommendation,
    modelVersion: prediction.model_version
  });

  // Generate alerts (best-effort: no impact to prediction API if alert creation fails).
  try {
    const rules = await AlertRule.find({ enabled: true }).lean();
    const machineInfo = machine ? { _id: String(machine._id), name: machine.name } : null;
    const createdByInfo = { _id: String(req.user._id), name: req.user.name, role: req.user.role };

    const pseudoLog = {
      _id: String(savedLog._id),
      machine: machineInfo,
      createdBy: createdByInfo,
      sensorData,
      failureProbability: savedLog.failureProbability,
      riskLevel: savedLog.riskLevel
    };

    const hits = evaluateRules(rules, pseudoLog);
    if (hits.length) {
      await AlertEvent.insertMany(
        hits.map((hit) => ({
          severity: hit.severity,
          rule: hit.rule,
          machine: machineInfo ? { id: machineInfo._id, name: machineInfo.name } : null,
          createdBy: { id: createdByInfo._id, name: createdByInfo.name, role: createdByInfo.role },
          predictionId: String(savedLog._id),
          snapshot: {
            failureProbability: savedLog.failureProbability,
            riskLevel: savedLog.riskLevel,
            sensorData
          },
          message: hit.message,
          triggeredAt: new Date()
        })),
        { ordered: false }
      );
    }
  } catch (_err) {
    // ignore
  }

  const populated = await PredictionLog.findById(savedLog._id)
    .populate("machine")
    .populate("createdBy", "name email role");
  return res.status(201).json(populated);
  })
);

module.exports = router;
