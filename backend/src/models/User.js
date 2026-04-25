const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin", "user"], default: "user" },
    avatarUrl: { type: String, default: null },
    preferences: {
      defaultMachineId: { type: mongoose.Schema.Types.ObjectId, ref: "Machine" },
      autoFillSensors: { type: Boolean, default: true },
      sensorDefaults: {
        temperature: Number,
        vibration: Number,
        humidity: Number,
        runtimeHours: Number,
        pressure: Number
      }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
