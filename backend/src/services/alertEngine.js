function coerceNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function compare({ operator, left, right }) {
  if (operator === "eq") return left === right;
  if (operator === "neq") return left !== right;

  const a = coerceNumber(left);
  const b = coerceNumber(right);
  if (a === null || b === null) return false;

  if (operator === "gt") return a > b;
  if (operator === "gte") return a >= b;
  if (operator === "lt") return a < b;
  if (operator === "lte") return a <= b;
  return false;
}

function getMetricValue(metric, predictionLog) {
  if (metric === "failureProbability") return predictionLog.failureProbability;
  if (metric === "riskLevel") return predictionLog.riskLevel;

  const sensor = predictionLog.sensorData || {};
  if (metric === "temperature") return sensor.temperature;
  if (metric === "vibration") return sensor.vibration;
  if (metric === "pressure") return sensor.pressure;
  if (metric === "humidity") return sensor.humidity;
  if (metric === "rpm") return sensor.rpm;
  if (metric === "voltage") return sensor.voltage;
  if (metric === "current") return sensor.current;
  if (metric === "runtimeHours") return sensor.runtimeHours;
  if (metric === "errorCount") return sensor.errorCount;
  if (metric === "maintenanceLagDays") return sensor.maintenanceLagDays;
  return undefined;
}

function buildMessage(rule, value) {
  const metricLabel = rule.metric === "failureProbability" ? "Failure probability" : rule.metric;
  return `${rule.name}: ${metricLabel} ${rule.operator} ${rule.value} (got ${value ?? "-"})`;
}

function evaluateRules(rules, predictionLog) {
  const enabled = (rules || []).filter((r) => r && r.enabled !== false);
  const hits = [];

  for (const rule of enabled) {
    const value = getMetricValue(rule.metric, predictionLog);
    const ok = compare({ operator: rule.operator, left: value, right: rule.value });
    if (!ok) continue;

    hits.push({
      severity: rule.severity || "High",
      rule: {
        id: rule._id ? String(rule._id) : rule.id ? String(rule.id) : null,
        name: rule.name,
        metric: rule.metric,
        operator: rule.operator,
        value: rule.value
      },
      message: buildMessage(rule, value),
      matchValue: value
    });
  }

  return hits;
}

module.exports = { evaluateRules };

