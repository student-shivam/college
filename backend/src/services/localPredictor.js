function sigmoid(x) {
  if (x >= 0) {
    const z = Math.exp(-x);
    return 1 / (1 + z);
  }
  const z = Math.exp(x);
  return z / (1 + z);
}

function riskLevel(probability) {
  if (probability < 0.25) return "Low";
  if (probability < 0.5) return "Medium";
  if (probability < 0.75) return "High";
  return "Critical";
}

function recommendation(level) {
  const mapping = {
    Low: "Continue normal operation and monitor weekly.",
    Medium: "Schedule preventive inspection within 7 days.",
    High: "Plan maintenance within 48 hours and reduce machine load.",
    Critical: "Immediate shutdown and maintenance recommended."
  };
  return mapping[level] || "Monitor and schedule inspection.";
}

function localPredict(payload) {
  // payload keys are snake_case (same as ML API)
  const score =
    0.05 * (payload.temperature - 70) +
    0.85 * (payload.vibration - 4) +
    0.03 * (payload.pressure - 35) +
    0.001 * (payload.humidity - 50) +
    0.0014 * (payload.rpm - 1800) +
    -0.02 * (payload.voltage - 230) +
    0.07 * (payload.current - 14) +
    0.00035 * (payload.runtime_hours - 3000) +
    0.42 * payload.error_count +
    0.013 * payload.maintenance_lag_days +
    -0.8;

  const probability = sigmoid(score);
  const level = riskLevel(probability);

  return {
    failure_probability: Number(probability.toFixed(4)),
    risk_level: level,
    recommendation: recommendation(level),
    model_version: "local-fallback-v1"
  };
}

module.exports = { localPredict };

