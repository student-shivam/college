const mongoose = require("mongoose");

const alertEventSchema = new mongoose.Schema(
  {
    severity: { type: String, enum: ["Low", "Medium", "High", "Critical"], default: "High" },
    rule: {
      id: { type: String, default: null },
      name: { type: String, default: null },
      metric: { type: String, default: null },
      operator: { type: String, default: null },
      value: { type: mongoose.Schema.Types.Mixed, default: null }
    },
    machine: {
      id: { type: String, default: null },
      name: { type: String, default: null }
    },
    createdBy: {
      id: { type: String, default: null },
      name: { type: String, default: null },
      role: { type: String, default: null }
    },
    predictionId: { type: String, default: null },
    snapshot: { type: mongoose.Schema.Types.Mixed, default: null },
    message: { type: String, default: "" },
    triggeredAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

alertEventSchema.index({ triggeredAt: -1 });

module.exports = mongoose.model("AlertEvent", alertEventSchema);

