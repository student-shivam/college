const axios = require("axios");
const { localPredict } = require("./localPredictor");

async function getPrediction(features) {
  const mlApiBase = process.env.ML_API_URL || "http://127.0.0.1:8000";
  const url = `${mlApiBase}/predict`;
  try {
    const response = await axios.post(url, features, { timeout: 3500 });
    return response.data;
  } catch (_err) {
    // Keep app working even when ml-api is down.
    return localPredict(features);
  }
}

module.exports = { getPrediction };
