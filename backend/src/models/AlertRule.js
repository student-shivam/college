const mongoose = require("mongoose");

const alertRuleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    enabled: { type: Boolean, default: true },
    severity: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "High"
    },
    metric: {
      type: String,
      enum: [
        "failureProbability",
        "riskLevel",
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
      ],
      required: true
    },
    operator: {
      type: String,
      enum: ["gt", "gte", "lt", "lte", "eq", "neq"],
      default: "gte"
    },
    value: { type: mongoose.Schema.Types.Mixed, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("AlertRule", alertRuleSchema);

