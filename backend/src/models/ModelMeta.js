const mongoose = require("mongoose");

const modelMetaSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "active" },
    status: {
      type: String,
      enum: ["Idle", "Training", "Completed", "Failed"],
      default: "Idle"
    },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    accuracy: { type: Number, default: null },
    loss: { type: Number, default: null },
    lastTrainedAt: { type: Date, default: null },
    startedAt: { type: Date, default: null },
    modelVersion: { type: String, default: null },
    lastError: { type: String, default: null },
    jobId: { type: String, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("ModelMeta", modelMetaSchema);

