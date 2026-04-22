const axios = require("axios");

const asyncHandler = require("../utils/asyncHandler");
const ModelMeta = require("../models/ModelMeta");
const { runtime, newId } = require("../state/runtime");

function mlApiBaseUrl() {
  return process.env.ML_API_URL || "http://127.0.0.1:8000";
}

function toResponse(meta) {
  if (!meta) return null;
  return {
    key: meta.key || "active",
    status: meta.status || "Idle",
    progress: Number(meta.progress) || 0,
    accuracy: meta.accuracy ?? null,
    loss: meta.loss ?? null,
    lastTrainedAt: meta.lastTrainedAt ?? null,
    startedAt: meta.startedAt ?? null,
    modelVersion: meta.modelVersion ?? null,
    lastError: meta.lastError ?? null,
    jobId: meta.jobId ?? null,
    updatedAt: meta.updatedAt ?? null
  };
}

async function getOrInitMeta() {
  const useDb = runtime.dbReady && !runtime.memoryMode;
  if (!useDb) return runtime.modelMeta;

  const existing = await ModelMeta.findOne({ key: "active" });
  if (existing) return existing;

  return ModelMeta.create({ key: "active" });
}

async function saveMeta(patch) {
  const useDb = runtime.dbReady && !runtime.memoryMode;
  if (!useDb) {
    runtime.modelMeta = { ...runtime.modelMeta, ...patch };
    return runtime.modelMeta;
  }

  return ModelMeta.findOneAndUpdate({ key: "active" }, patch, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true
  });
}

async function runTrainJob(jobId, mode) {
  let tick = null;
  try {
    let progress = 2;
    // "Nice" progress for UI even if ML API is synchronous.
    tick = setInterval(() => {
      progress = Math.min(progress + 4, 95);
      // Avoid noisy DB writes; memory-mode can update immediately.
      const useDb = runtime.dbReady && !runtime.memoryMode;
      if (!useDb) {
        if (runtime.modelMeta.jobId !== jobId || runtime.modelMeta.status !== "Training") return;
        runtime.modelMeta.progress = progress;
        return;
      }

      // In DB-mode, progress is best-effort (training completion will set 100 anyway).
      ModelMeta.updateOne({ key: "active", status: "Training", jobId }, { $set: { progress } }).catch(
        () => {}
      );
    }, 1100);

    const url = `${mlApiBaseUrl()}/train`;
    const response = await axios.post(
      url,
      { mode: mode || "train" },
      { timeout: 10 * 60 * 1000 }
    );

    const trainedAt = response.data?.trained_at ? new Date(response.data.trained_at) : new Date();

    await saveMeta({
      status: "Completed",
      progress: 100,
      accuracy: response.data?.accuracy ?? null,
      loss: response.data?.loss ?? null,
      lastTrainedAt: trainedAt,
      startedAt: null,
      modelVersion: response.data?.model_version ?? null,
      lastError: null,
      jobId: null
    });
  } catch (err) {
    await saveMeta({
      status: "Failed",
      progress: 0,
      startedAt: null,
      lastError:
        err.response?.data?.message ||
        err.response?.data?.detail ||
        err.message ||
        "Training failed",
      jobId: null
    });
  } finally {
    if (tick) clearInterval(tick);
  }
}

const getModelStatus = asyncHandler(async (_req, res) => {
  const meta = await getOrInitMeta();
  return res.json(toResponse(meta));
});

const trainModel = asyncHandler(async (_req, res) => {
  const meta = await getOrInitMeta();
  if ((meta.status || runtime.modelMeta.status) === "Training") {
    return res.status(409).json({ message: "Model is already training", meta: toResponse(meta) });
  }

  const jobId = newId();
  const startedAt = new Date();
  const updated = await saveMeta({
    status: "Training",
    progress: 2,
    startedAt,
    lastError: null,
    jobId
  });

  setImmediate(() => runTrainJob(jobId, "train"));
  return res.status(202).json(toResponse(updated));
});

const updateModel = asyncHandler(async (_req, res) => {
  const meta = await getOrInitMeta();
  if ((meta.status || runtime.modelMeta.status) === "Training") {
    return res.status(409).json({ message: "Model is already training", meta: toResponse(meta) });
  }

  const jobId = newId();
  const startedAt = new Date();
  const updated = await saveMeta({
    status: "Training",
    progress: 2,
    startedAt,
    lastError: null,
    jobId
  });

  setImmediate(() => runTrainJob(jobId, "update"));
  return res.status(202).json(toResponse(updated));
});

module.exports = { getModelStatus, trainModel, updateModel };
