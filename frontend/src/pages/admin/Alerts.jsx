import { useEffect, useMemo, useState } from "react";
import { backend } from "../../services/backend";

const METRICS = [
  { value: "failureProbability", label: "Failure Probability" },
  { value: "riskLevel", label: "Risk Level" },
  { value: "temperature", label: "Temperature" },
  { value: "vibration", label: "Vibration" },
  { value: "pressure", label: "Pressure" },
  { value: "humidity", label: "Humidity" },
  { value: "rpm", label: "RPM" },
  { value: "voltage", label: "Voltage" },
  { value: "current", label: "Current" },
  { value: "runtimeHours", label: "Runtime Hours" },
  { value: "errorCount", label: "Error Count" },
  { value: "maintenanceLagDays", label: "Maintenance Lag Days" }
];

const OPS = [
  { value: "gt", label: ">" },
  { value: "gte", label: ">=" },
  { value: "lt", label: "<" },
  { value: "lte", label: "<=" },
  { value: "eq", label: "=" },
  { value: "neq", label: "!=" }
];

const SEVERITIES = ["Low", "Medium", "High", "Critical"];
const RISK_LEVELS = ["Low", "Medium", "High", "Critical"];

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

function metricLabel(metric) {
  return METRICS.find((m) => m.value === metric)?.label || metric || "-";
}

function buildRuleSummary(rule) {
  if (!rule) return "-";
  return `${metricLabel(rule.metric)} ${rule.operator} ${rule.value}`;
}

export default function AdminAlertsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const [rules, setRules] = useState([]);
  const [events, setEvents] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    enabled: true,
    severity: "High",
    metric: "failureProbability",
    operator: "gte",
    value: 0.75
  });

  async function loadAll({ silent = false } = {}) {
    if (!silent) setLoading(true);
    setError("");
    try {
      const [rulesRes, eventsRes] = await Promise.all([
        backend.listAlertRules(),
        backend.listAlertEvents(60)
      ]);
      setRules(Array.isArray(rulesRes) ? rulesRes : []);
      setEvents(Array.isArray(eventsRes) ? eventsRes : []);
    } catch (err) {
      const code = err?.response?.status;
      if (code === 404) {
        setAutoRefresh(false);
        setError(
          "Alerts API not found (404). Restart the backend so it picks up the latest routes, then refresh."
        );
        return;
      }
      setError(err.response?.data?.message || err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return () => {};
    const t = setInterval(() => loadAll({ silent: true }), 4000);
    return () => clearInterval(t);
  }, [autoRefresh]);

  function openCreate() {
    setEditing(null);
    setForm({
      name: "High failure risk",
      enabled: true,
      severity: "High",
      metric: "failureProbability",
      operator: "gte",
      value: 0.75
    });
    setModalOpen(true);
  }

  function openEdit(rule) {
    setEditing(rule);
    setForm({
      name: rule.name || "",
      enabled: rule.enabled !== false,
      severity: rule.severity || "High",
      metric: rule.metric || "failureProbability",
      operator: rule.operator || "gte",
      value: rule.value ?? ""
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  const isRiskMetric = form.metric === "riskLevel";

  const normalizedValue = useMemo(() => {
    if (isRiskMetric) return String(form.value || "High");
    const n = Number(form.value);
    return Number.isFinite(n) ? n : form.value;
  }, [form.value, isRiskMetric]);

  async function saveRule() {
    setSaving(true);
    setError("");
    setStatus("");
    try {
      const payload = {
        name: String(form.name || "").trim(),
        enabled: Boolean(form.enabled),
        severity: form.severity,
        metric: form.metric,
        operator: form.operator,
        value: normalizedValue
      };

      if (!payload.name) {
        setError("Rule name is required.");
        return;
      }

      if (editing?._id) {
        await backend.updateAlertRule(editing._id, payload);
        setStatus("Rule updated.");
      } else {
        await backend.createAlertRule(payload);
        setStatus("Rule created.");
      }
      closeModal();
      await loadAll({ silent: true });
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleRule(rule) {
    setError("");
    setStatus("");
    try {
      await backend.updateAlertRule(rule._id, { enabled: !(rule.enabled !== false) });
      await loadAll({ silent: true });
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function deleteRule(rule) {
    if (!window.confirm(`Delete rule "${rule.name}"?`)) return;
    setError("");
    setStatus("");
    try {
      await backend.deleteAlertRule(rule._id);
      setStatus("Rule deleted.");
      await loadAll({ silent: true });
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-kicker">ADMIN</div>
          <h1>Alerts Management</h1>
          <p className="muted">Create alert rules and monitor triggered alerts from prediction logs.</p>
        </div>
        <div className="page-actions">
          <button type="button" onClick={openCreate}>
            Add Rule
          </button>
          <button type="button" className="btn-secondary" onClick={() => loadAll()} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && <div className="banner banner-danger">{error}</div>}
      {status && <div className="banner banner-success">{status}</div>}

      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-title">Alert Rules</div>
            <div className="panel-sub">Rules are evaluated every time a prediction is created.</div>
          </div>
        </div>

        <div className="table-wrap">
          <table className="table table-alerts">
            <thead>
              <tr>
                <th>Name</th>
                <th>Condition</th>
                <th>Severity</th>
                <th>Status</th>
                <th style={{ width: 220 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule._id}>
                  <td className="cell-strong">{rule.name}</td>
                  <td>{buildRuleSummary(rule)}</td>
                  <td>
                    <span className="severity-pill" data-sev={rule.severity || "High"}>
                      {rule.severity || "High"}
                    </span>
                  </td>
                  <td>{rule.enabled !== false ? "Enabled" : "Disabled"}</td>
                  <td>
                    <div className="row-actions row-actions-tight">
                      <button type="button" className="btn-secondary" onClick={() => toggleRule(rule)}>
                        {rule.enabled !== false ? "Disable" : "Enable"}
                      </button>
                      <button type="button" className="btn-secondary" onClick={() => openEdit(rule)}>
                        Edit
                      </button>
                      <button type="button" className="btn-danger" onClick={() => deleteRule(rule)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && rules.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    No rules yet. Click <strong>Add Rule</strong> to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-title">Recent Alerts</div>
            <div className="panel-sub">Triggered alerts are stored and shown here.</div>
          </div>
        </div>

        <div className="table-wrap">
          <table className="table table-alerts">
            <thead>
              <tr>
                <th>When</th>
                <th>Severity</th>
                <th>Rule</th>
                <th>Machine</th>
                <th>Snapshot</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event._id}>
                  <td>{formatDate(event.triggeredAt || event.createdAt)}</td>
                  <td>
                    <span className="severity-pill" data-sev={event.severity || "High"}>
                      {event.severity || "High"}
                    </span>
                  </td>
                  <td className="cell-wrap" title={event.message || ""}>
                    {event.rule?.name || "-"}
                  </td>
                  <td>{event.machine?.name || event.machine?.id || "-"}</td>
                  <td className="cell-wrap">
                    {event.snapshot?.riskLevel
                      ? `Risk: ${event.snapshot.riskLevel} • P=${event.snapshot.failureProbability}`
                      : "-"}
                  </td>
                </tr>
              ))}
              {!loading && events.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    No alerts triggered yet. Create a rule and run a prediction.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modalOpen && (
        <div className="admin-modal" role="dialog" aria-modal="true">
          <div className="admin-modal-panel">
            <div className="admin-modal-head">
              <div>
                <div className="panel-title">{editing ? "Edit Rule" : "Create Rule"}</div>
                <div className="panel-sub">Alerts are triggered from prediction results.</div>
              </div>
              <button type="button" className="admin-modal-close" onClick={closeModal} aria-label="Close">
                ×
              </button>
            </div>

            <div className="form-grid">
              <input
                placeholder="Rule name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />

              <label className="form-row">
                <span className="form-label">Enabled</span>
                <select
                  className="select"
                  value={form.enabled ? "yes" : "no"}
                  onChange={(e) => setForm((p) => ({ ...p, enabled: e.target.value === "yes" }))}
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>

              <div className="two-col">
                <label className="form-row">
                  <span className="form-label">Severity</span>
                  <select
                    className="select"
                    value={form.severity}
                    onChange={(e) => setForm((p) => ({ ...p, severity: e.target.value }))}
                  >
                    {SEVERITIES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-row">
                  <span className="form-label">Metric</span>
                  <select
                    className="select"
                    value={form.metric}
                    onChange={(e) => {
                      const metric = e.target.value;
                      setForm((p) => ({
                        ...p,
                        metric,
                        operator: metric === "riskLevel" ? "eq" : p.operator,
                        value: metric === "riskLevel" ? "High" : p.value
                      }));
                    }}
                  >
                    {METRICS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="two-col">
                <label className="form-row">
                  <span className="form-label">Operator</span>
                  <select
                    className="select"
                    value={form.operator}
                    onChange={(e) => setForm((p) => ({ ...p, operator: e.target.value }))}
                    disabled={isRiskMetric}
                  >
                    {OPS.map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-row">
                  <span className="form-label">Value</span>
                  {isRiskMetric ? (
                    <select
                      className="select"
                      value={String(form.value)}
                      onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))}
                    >
                      {RISK_LEVELS.map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="number"
                      step="any"
                      value={form.value}
                      onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))}
                      placeholder="e.g. 0.75"
                    />
                  )}
                </label>
              </div>

              <div className="form-actions">
                <button type="button" onClick={saveRule} disabled={saving}>
                  {saving ? "Saving..." : editing ? "Save Changes" : "Create Rule"}
                </button>
                <button type="button" className="btn-secondary" onClick={closeModal} disabled={saving}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
