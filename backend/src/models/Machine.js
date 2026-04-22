const mongoose = require("mongoose");

const machineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    location: { type: String, default: "Unknown" },
    modelNumber: { type: String, default: "N/A" },
    installedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Machine", machineSchema);

