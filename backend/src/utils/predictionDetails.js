function clamp01(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.min(Math.max(n, 0), 1);
}

function toHoursText(hours) {
  if (!Number.isFinite(hours) || hours <= 0) return "—";
  if (hours < 48) return `${Math.round(hours)} hours`;
  const days = hours / 24;
  if (days < 14) return `${days.toFixed(1)} days`;
  return `${Math.round(days)} days`;
}

function estimateFailureWindow({ failureProbability, riskLevel }) {
  const p = clamp01(Number(failureProbability));
  const risk = String(riskLevel || "").toLowerCase();

  let minHours = 240;
  let maxHours = 720;
  if (risk === "critical") {
    minHours = 6;
    maxHours = 24;
  } else if (risk === "high") {
    minHours = 24;
    maxHours = 72;
  } else if (risk === "medium") {
    minHours = 72;
    maxHours = 240;
  } else if (risk === "low") {
    minHours = 240;
    maxHours = 720;
  }

  const expectedHours = maxHours - (maxHours - minHours) * p;
  const rangeLo = Math.max(1, expectedHours * 0.7);
  const rangeHi = expectedHours * 1.3;

  return {
    expectedHours,
    rangeHours: [rangeLo, rangeHi],
    expectedText: toHoursText(expectedHours),
    rangeText: `${toHoursText(rangeLo)} – ${toHoursText(rangeHi)}`
  };
}

function deriveSignals(sensorData) {
  const s = sensorData || {};
  const signals = [];

  const temperature = Number(s.temperature);
  if (Number.isFinite(temperature) && temperature >= 82) {
    signals.push("Temperature is high — check cooling, lubrication, and load.");
  } else if (Number.isFinite(temperature) && temperature <= 55) {
    signals.push("Temperature is low/unusual — verify sensor calibration and environment.");
  }

  const vibration = Number(s.vibration);
  if (Number.isFinite(vibration) && vibration >= 5.0) {
    signals.push("Vibration is high — inspect bearings, alignment, and mounting.");
  }

  const humidity = Number(s.humidity);
  if (Number.isFinite(humidity) && humidity >= 65) {
    signals.push("Humidity is high — check sealing and corrosion risk.");
  }

  const pressure = Number(s.pressure);
  if (Number.isFinite(pressure) && (pressure <= 25 || pressure >= 45)) {
    signals.push("Pressure is out of normal range — check pumps/filters/valves.");
  }

  const runtimeHours = Number(s.runtimeHours);
  if (Number.isFinite(runtimeHours) && runtimeHours >= 2000) {
    signals.push("High runtime hours — schedule inspection and preventive maintenance.");
  }

  return signals.slice(0, 4);
}

function nextStepsForRisk(riskLevel) {
  const risk = String(riskLevel || "").toLowerCase();
  if (risk === "critical") {
    return [
      "Stop or reduce load if possible.",
      "Inspect critical components (bearings, drive, lubrication) immediately.",
      "Create a maintenance work order and keep spare parts ready."
    ];
  }
  if (risk === "high") {
    return [
      "Plan maintenance within 24–72 hours.",
      "Inspect vibration sources, lubrication, and overheating.",
      "Monitor readings more frequently until fixed."
    ];
  }
  if (risk === "medium") {
    return [
      "Plan maintenance within 3–10 days.",
      "Check operating conditions and early wear indicators.",
      "Continue monitoring and compare trend over time."
    ];
  }
  return [
    "Keep monitoring.",
    "Schedule routine inspection as per maintenance plan.",
    "Re-run prediction after any operating change."
  ];
}

function buildPredictionDetails({ sensorData, failureProbability, riskLevel }) {
  const eta = estimateFailureWindow({ failureProbability, riskLevel });
  const signals = deriveSignals(sensorData);
  const nextSteps = nextStepsForRisk(riskLevel);

  return {
    etaHours: eta.expectedHours,
    etaRangeHours: eta.rangeHours,
    etaText: eta.expectedText,
    etaRangeText: eta.rangeText,
    signals,
    nextSteps
  };
}

module.exports = {
  buildPredictionDetails
};

