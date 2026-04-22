const mongoose = require("mongoose");
const { runtime } = require("../state/runtime");

async function connectDB() {
  runtime.dbReady = false;
  runtime.memoryMode = true;

  const primaryUri = process.env.MONGO_URI;
  const fallbackUri =
    process.env.MONGO_URI_FALLBACK || "mongodb://127.0.0.1:27017/predictive_maintenance";

  if (!primaryUri) {
    throw new Error("MONGO_URI is not configured");
  }

  try {
    await mongoose.connect(primaryUri, { serverSelectionTimeoutMS: 2500 });
    console.log("MongoDB connected (primary)");
    runtime.dbReady = true;
    runtime.memoryMode = false;
    return;
  } catch (primaryErr) {
    const atlasLike = primaryUri.includes("mongodb.net");
    if (!atlasLike) {
      throw primaryErr;
    }

    console.warn(
      "Primary Mongo URI failed (likely Atlas IP whitelist issue). Trying local fallback..."
    );

    try {
      await mongoose.connect(fallbackUri, { serverSelectionTimeoutMS: 2500 });
      console.log("MongoDB connected (fallback local)");
      runtime.dbReady = true;
      runtime.memoryMode = false;
      return;
    } catch (fallbackErr) {
      runtime.memoryMode = true;
      runtime.dbReady = false;
      console.warn(
        `Mongo unavailable. Starting in memory mode. Primary: ${primaryErr.message} | Fallback: ${fallbackErr.message}`
      );
    }
  }
}

module.exports = connectDB;
