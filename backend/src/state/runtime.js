const { randomUUID } = require("crypto");

const runtime = {
  memoryMode: true,
  dbReady: false,
  users: [],
  machines: [],
  predictions: [],
  sensorData: [],
  alertRules: [],
  alertEvents: [],
  modelMeta: {
    key: "active",
    status: "Idle",
    progress: 0,
    accuracy: null,
    loss: null,
    lastTrainedAt: null,
    startedAt: null,
    modelVersion: null,
    lastError: null,
    jobId: null
  }
};

function newId() {
  return randomUUID();
}

module.exports = { runtime, newId };
