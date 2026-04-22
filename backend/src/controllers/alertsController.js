const AlertRule = require("../models/AlertRule");
const AlertEvent = require("../models/AlertEvent");
const asyncHandler = require("../utils/asyncHandler");
const { runtime, newId } = require("../state/runtime");

function validateRuleInput(body) {
  const name = String(body.name || "").trim();
  const metric = String(body.metric || "").trim();
  const operator = String(body.operator || "").trim();
  const severity = String(body.severity || "").trim();
  const value = body.value;

  if (!name) return { error: "name is required" };
  if (!metric) return { error: "metric is required" };
  if (!operator) return { error: "operator is required" };
  if (!severity) return { error: "severity is required" };
  if (value === undefined || value === null || value === "") return { error: "value is required" };

  const enabled = body.enabled === undefined ? true : Boolean(body.enabled);
  return { rule: { name, metric, operator, severity, value, enabled } };
}

const listRules = asyncHandler(async (_req, res) => {
  const useDb = runtime.dbReady && !runtime.memoryMode;
  if (!useDb) {
    const rules = [...runtime.alertRules].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.json(rules);
  }

  const rules = await AlertRule.find().sort({ createdAt: -1 });
  return res.json(rules);
});

const createRule = asyncHandler(async (req, res) => {
  const { rule, error } = validateRuleInput(req.body);
  if (error) return res.status(400).json({ message: error });

  const useDb = runtime.dbReady && !runtime.memoryMode;
  if (!useDb) {
    const now = new Date().toISOString();
    const created = {
      _id: newId(),
      ...rule,
      createdAt: now,
      updatedAt: now
    };
    runtime.alertRules.push(created);
    return res.status(201).json(created);
  }

  const created = await AlertRule.create(rule);
  return res.status(201).json(created);
});

const updateRule = asyncHandler(async (req, res) => {
  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ message: "id is required" });

  const patch = {};
  if (req.body.name !== undefined) patch.name = String(req.body.name || "").trim();
  if (req.body.metric !== undefined) patch.metric = String(req.body.metric || "").trim();
  if (req.body.operator !== undefined) patch.operator = String(req.body.operator || "").trim();
  if (req.body.severity !== undefined) patch.severity = String(req.body.severity || "").trim();
  if (req.body.value !== undefined) patch.value = req.body.value;
  if (req.body.enabled !== undefined) patch.enabled = Boolean(req.body.enabled);

  const useDb = runtime.dbReady && !runtime.memoryMode;
  if (!useDb) {
    const idx = runtime.alertRules.findIndex((r) => String(r._id) === id);
    if (idx === -1) return res.status(404).json({ message: "Rule not found" });
    const now = new Date().toISOString();
    runtime.alertRules[idx] = { ...runtime.alertRules[idx], ...patch, updatedAt: now };
    return res.json(runtime.alertRules[idx]);
  }

  const updated = await AlertRule.findByIdAndUpdate(id, patch, { new: true });
  if (!updated) return res.status(404).json({ message: "Rule not found" });
  return res.json(updated);
});

const deleteRule = asyncHandler(async (req, res) => {
  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ message: "id is required" });

  const useDb = runtime.dbReady && !runtime.memoryMode;
  if (!useDb) {
    const idx = runtime.alertRules.findIndex((r) => String(r._id) === id);
    if (idx === -1) return res.status(404).json({ message: "Rule not found" });
    runtime.alertRules.splice(idx, 1);
    return res.json({ ok: true });
  }

  const deleted = await AlertRule.findByIdAndDelete(id);
  if (!deleted) return res.status(404).json({ message: "Rule not found" });
  return res.json({ ok: true });
});

const listEvents = asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
  const useDb = runtime.dbReady && !runtime.memoryMode;
  if (!useDb) {
    const events = [...runtime.alertEvents]
      .sort((a, b) => new Date(b.triggeredAt) - new Date(a.triggeredAt))
      .slice(0, limit);
    return res.json(events);
  }

  const events = await AlertEvent.find().sort({ triggeredAt: -1 }).limit(limit);
  return res.json(events);
});

module.exports = { listRules, createRule, updateRule, deleteRule, listEvents };

