import { useEffect, useMemo, useState } from "react";
import { backend } from "../../services/backend";
import { useAuth } from "../../auth/AuthProvider";
import { playRiskSound } from "../../utils/sound";
import { toast } from "../../utils/toastBus";
import { toUiErrorMessage } from "../../utils/toUiErrorMessage";
import { broadcastPredictionCreated } from "../../utils/predictionEvents";
import { initialSensors, sensorFields, sensorFieldsAll } from "./predictionFormData";

const ELLIPSIS = "\u2026";
const DASH = "\u2014";

function clampNumber(n, min, max) {
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(n, min), max);
}

function normalizeRiskKey(riskLevel) {
  const raw = String(riskLevel || "").trim().toLowerCase();
  const compact = raw.replace(/\s+/g, "");
  if (compact === "low" || compact === "normal" || compact === "healthy") return "low";
  if (compact === "medium" || compact === "warning") return "medium";
  if (compact === "high" || compact === "highrisk") return "high";
  if (compact === "critical") return "critical";
  return "";
}

function formatRiskLabel(riskLevel) {
  const key = normalizeRiskKey(riskLevel);
  if (key === "low") return "Normal";
  if (key === "medium") return "Warning";
  if (key === "high") return "High Risk";
  if (key === "critical") return "Critical";
  return String(riskLevel || DASH) || DASH;
}

function riskSummary(key) {
  if (key === "low") return "Operation looks healthy based on current sensor readings.";
  if (key === "medium") return "Early risk signals detected. Schedule an inspection soon.";
  if (key === "high") return "Elevated failure risk. Plan maintenance and reduce load.";
  if (key === "critical") return "Immediate action recommended. Stop operation if unsafe.";
  return "";
}

export default function UserPredictionsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [predictLoading, setPredictLoading] = useState(false);
  const [backendOnline, setBackendOnline] = useState(true);
  const [machines, setMachines] = useState([]);
  const [selectedMachineId, setSelectedMachineId] = useState("");
  const [sensors, setSensors] = useState(initialSensors);
  const [latestPrediction, setLatestPrediction] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [query, setQuery] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [prefsApplied, setPrefsApplied] = useState(false);

  useEffect(() => {
    if (prefsApplied) return;
    const prefs = user?.preferences || null;
    if (!prefs) return;

    if (!selectedMachineId && prefs.defaultMachineId) {
      setSelectedMachineId(String(prefs.defaultMachineId));
    }

    const sd = prefs.sensorDefaults || null;
    if (prefs.autoFillSensors && sd && typeof sd === "object") {
      setSensors((prev) => {
        const next = { ...prev };
        for (const [key, value] of Object.entries(sd)) {
          if (!Number.isFinite(value)) continue;
          next[key] = value;
        }
        return next;
      });
    }

    setPrefsApplied(true);
  }, [user, prefsApplied, selectedMachineId]);

  async function checkBackend() {
    try {
      await backend.pingBackend();
      setBackendOnline(true);
      return true;
    } catch (_err) {
      setBackendOnline(false);
      return false;
    }
  }

  async function load() {
    setLoading(true);
    const ok = await checkBackend();
    if (!ok) {
      setLoading(false);
      toast.error("Service is currently unavailable. Please try again.", {
        dedupeKey: "user-predictions-backend-offline"
      });
      return;
    }
    try {
      const [mRes, list] = await Promise.all([
        backend.listMachines(),
        backend.listPredictions(200)
      ]);
      setMachines(mRes || []);
      setPredictions(list || []);
    } catch (err) {
      toast.error(toUiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const selectedMachine = useMemo(() => {
    return machines.find((m) => String(m._id) === String(selectedMachineId)) || null;
  }, [machines, selectedMachineId]);

  const riskBadgeClass = useMemo(() => {
    if (!latestPrediction) return "";
    const key = normalizeRiskKey(latestPrediction.riskLevel);
    return `risk-badge${key ? ` risk-${key}` : ""}`;
  }, [latestPrediction]);

  const latestRiskKey = useMemo(() => {
    if (!latestPrediction) return "";
    return normalizeRiskKey(latestPrediction.riskLevel);
  }, [latestPrediction]);

  const probabilityPct = useMemo(() => {
    if (!latestPrediction || typeof latestPrediction.failureProbability !== "number") return null;
    return clampNumber(latestPrediction.failureProbability * 100, 0, 100);
  }, [latestPrediction]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return predictions;
    return predictions.filter((p) => {
      const machine = String(p.machine?.name || "").toLowerCase();
      const risk = String(p.riskLevel || "").toLowerCase();
      return machine.includes(q) || risk.includes(q);
    });
  }, [predictions, query]);

  async function predict(e) {
    e.preventDefault();
    setPredictLoading(true);
    const ok = backendOnline || (await checkBackend());
    if (!ok) {
      setPredictLoading(false);
      toast.error("Service is currently unavailable. Please try again.");
      return;
    }
    try {
      const payload = { ...sensors, machineId: selectedMachineId || undefined };
      const prefs = user?.preferences || null;
      const sd = prefs?.sensorDefaults || null;
      if (prefs?.autoFillSensors && sd && typeof sd === "object") {
        for (const [key, value] of Object.entries(sd)) {
          const curr = payload[key];
          if (curr === "" || curr === undefined || curr === null) {
            if (Number.isFinite(value)) payload[key] = value;
          }
        }
      }
      const res = await backend.createPrediction(payload);
      setLatestPrediction(res);
      playRiskSound(res?.riskLevel);
      broadcastPredictionCreated({ scope: "user", predictionId: res?._id || null });
      await load();
    } catch (err) {
      toast.error(toUiErrorMessage(err));
    } finally {
      setPredictLoading(false);
    }
  }

  function applyPreset(kind) {
    if (kind === "normal") {
      setSensors((prev) => ({
        ...prev,
        temperature: 70,
        vibration: 3.2,
        pressure: 35,
        humidity: 45,
        rpm: 1800,
        voltage: 230,
        current: 14,
        runtimeHours: 1500,
        errorCount: 0,
        maintenanceLagDays: 10
      }));
      return;
    }
    if (kind === "warning") {
      setSensors((prev) => ({
        ...prev,
        temperature: 88,
        vibration: 5.7,
        pressure: 48,
        humidity: 62,
        rpm: 2400,
        voltage: 220,
        current: 18,
        runtimeHours: 4200,
        errorCount: 2,
        maintenanceLagDays: 35
      }));
      return;
    }
    if (kind === "critical") {
      setSensors((prev) => ({
        ...prev,
        temperature: 110,
        vibration: 9.4,
        pressure: 78,
        humidity: 78,
        rpm: 3900,
        voltage: 210,
        current: 26,
        runtimeHours: 9600,
        errorCount: 5,
        maintenanceLagDays: 90
      }));
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-kicker">USER</div>
          <h1>Predictions</h1>
          <p className="muted">Run a prediction and review your history.</p>
        </div>
        <div className="page-actions">
          <input
            className="search"
            placeholder="Search machine / risk"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className={`status-indicator ${backendOnline ? "is-ok" : "is-bad"}`}>
            <span className="status-dot" aria-hidden="true" />
            <span className="status-text">Backend {backendOnline ? "Online" : "Offline"}</span>
          </div>
          <button type="button" className="btn-secondary" onClick={load} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="predictions-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Run Prediction</div>
              <div className="panel-sub">
                Enter sensor readings and get a real-time failure-risk estimate.
              </div>
            </div>
            <div className="pred-actions">
              <button type="button" className="chip-btn" onClick={() => setSensors(initialSensors)}>
                Reset
              </button>
              <button type="button" className="chip-btn" onClick={() => applyPreset("normal")}>
                Normal
              </button>
              <button type="button" className="chip-btn" onClick={() => applyPreset("warning")}>
                Warning
              </button>
              <button type="button" className="chip-btn" onClick={() => applyPreset("critical")}>
                Critical
              </button>
            </div>
          </div>

          <form onSubmit={predict} className="pred-form">
            <div className="pred-row">
              <label className="pred-field">
                <span>Machine</span>
                <select
                  className="select"
                  value={selectedMachineId}
                  onChange={(e) => setSelectedMachineId(e.target.value)}
                >
                  <option value="">No machine selected</option>
                  {machines.map((machine) => (
                    <option key={machine._id} value={machine._id}>
                      {machine.name}
                    </option>
                  ))}
                </select>
                <small className="pred-hint">
                  {selectedMachine ? `Selected: ${selectedMachine.name}` : "Optional (for tracking)"}
                </small>
              </label>

              <div className="pred-toggle">
                <button
                  type="button"
                  className="chip-btn"
                  onClick={() => setShowAdvanced((v) => !v)}
                >
                  {showAdvanced ? "Hide advanced" : "Show advanced"}
                </button>
              </div>
            </div>

            <div className="pred-fields">
              {(showAdvanced ? sensorFieldsAll : sensorFields).map(([field, label]) => (
                <label key={field} className="pred-field">
                  <span>{label}</span>
                  <input
                    className="input"
                    type="number"
                    step="any"
                    value={sensors[field]}
                    onChange={(e) =>
                      setSensors((prev) => ({
                        ...prev,
                        [field]: e.target.value
                      }))
                    }
                  />
                </label>
              ))}
            </div>

            <div className="pred-submit-row">
              <button
                type="submit"
                disabled={predictLoading || !backendOnline}
                className="pred-submit"
              >
                {predictLoading ? `Predicting${ELLIPSIS}` : "Predict Failure Risk"}
              </button>
              <div className="pred-submit-sub muted">
                {backendOnline
                  ? showAdvanced
                    ? "All features enabled"
                    : "Basic fields shown; others use defaults"
                  : "Backend offline (prediction disabled)"}
              </div>
            </div>
          </form>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div className="panel-title">Latest Prediction</div>
            <div className="panel-sub">Live result</div>
          </div>
          {latestPrediction ? (
            <div className="pred-result">
              <div className="pred-result-head">
                <div className={riskBadgeClass}>{formatRiskLabel(latestPrediction.riskLevel)}</div>
                <div className="pred-meta muted">
                  {latestPrediction.predictedAt
                    ? new Date(latestPrediction.predictedAt).toLocaleString()
                    : DASH}
                </div>
              </div>

              {latestRiskKey && <div className="pred-status-sub">{riskSummary(latestRiskKey)}</div>}

              <div className="pred-prob">
                <div className="pred-prob-top">
                  <div className="pred-prob-label">Failure Probability</div>
                  <div className="pred-prob-value">
                    {typeof latestPrediction.failureProbability === "number"
                      ? `${(latestPrediction.failureProbability * 100).toFixed(2)}%`
                      : DASH}
                  </div>
                </div>
                <div className="pred-prob-track" aria-hidden="true">
                  <div className="pred-prob-fill" style={{ width: `${probabilityPct ?? 0}%` }} />
                </div>
              </div>

              <div className="pred-kv">
                <div className="pred-kv-item">
                  <div className="pred-kv-k">ETA</div>
                  <div className="pred-kv-v">
                    {latestPrediction.etaRangeText || latestPrediction.etaText || DASH}
                  </div>
                </div>
                <div className="pred-kv-item">
                  <div className="pred-kv-k">Model</div>
                  <div className="pred-kv-v">{latestPrediction.modelVersion || DASH}</div>
                </div>
              </div>

              <div className="pred-reco">
                <div className="pred-reco-k">Recommendation</div>
                <div className="pred-reco-v">{latestPrediction.recommendation || DASH}</div>
              </div>

              {Array.isArray(latestPrediction.signals) && latestPrediction.signals.length > 0 && (
                <div className="pred-chip-block">
                  <div className="pred-chip-k">Signals</div>
                  <div className="chips">
                    {latestPrediction.signals.map((s) => (
                      <span key={s} className="chip">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {Array.isArray(latestPrediction.nextSteps) &&
                latestPrediction.nextSteps.length > 0 && (
                  <div className="pred-chip-block">
                    <div className="pred-chip-k">Next steps</div>
                    <div className="chips">
                      {latestPrediction.nextSteps.map((s) => (
                        <span key={s} className="chip is-primary">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          ) : (
            <p className="muted">No prediction generated yet.</p>
          )}
        </section>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div className="panel-title">Recent Predictions</div>
          <div className="panel-sub">{loading ? "Loading..." : `${filtered.length} records`}</div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Machine</th>
                <th>Risk</th>
                <th>Probability</th>
                <th>ETA</th>
                <th>Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row._id}>
                  <td>{row.predictedAt ? new Date(row.predictedAt).toLocaleString() : DASH}</td>
                  <td>{row.machine?.name || DASH}</td>
                  <td>
                    <span
                      className={`risk-badge${
                        normalizeRiskKey(row.riskLevel)
                          ? ` risk-${normalizeRiskKey(row.riskLevel)}`
                          : ""
                      }`}
                    >
                      {formatRiskLabel(row.riskLevel)}
                    </span>
                  </td>
                  <td>
                    <div className="prob-cell">
                      <div className="prob-text">
                        {typeof row.failureProbability === "number"
                          ? `${(row.failureProbability * 100).toFixed(2)}%`
                          : DASH}
                      </div>
                      <div className="prob-track" aria-hidden="true">
                        <div
                          className="prob-fill"
                          style={{
                            width: `${clampNumber((Number(row.failureProbability) || 0) * 100, 0, 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td>{row.etaRangeText || row.etaText || DASH}</td>
                  <td className="cell-wrap">{row.recommendation || DASH}</td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">
                    No predictions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
