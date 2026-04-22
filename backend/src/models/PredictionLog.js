const mongoose = require("mongoose");

const sensorDataSchema = new mongoose.Schema(
  {
    temperature: Number,
    vibration: Number,
    pressure: Number,
    humidity: Number,
    rpm: Number,
    voltage: Number,
    current: Number,
    runtimeHours: Number,
    errorCount: Number,
    maintenanceLagDays: Number
  },
  { _id: false }
);

const predictionLogSchema = new mongoose.Schema(
  {
    machine: { type: mongoose.Schema.Types.ObjectId, ref: "Machine" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    sensorData: { type: sensorDataSchema, required: true },
    failureProbability: { type: Number, required: true },
    riskLevel: { type: String, required: true },
    recommendation: { type: String, required: true },
    modelVersion: { type: String, default: "v1.0" },
    predictedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model("PredictionLog", predictionLogSchema);
