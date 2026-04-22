const mongoose = require("mongoose");

const sensorDataSchema = new mongoose.Schema(
  {
    machineId: { type: String, required: true, trim: true },
    temperature: { type: Number, required: true },
    vibration: { type: Number, required: true },
    pressure: { type: Number, required: true },
    timestamp: { type: Date, required: true }
  },
  { timestamps: true }
);

sensorDataSchema.index({ machineId: 1, timestamp: -1 });

module.exports = mongoose.model("SensorData", sensorDataSchema);

