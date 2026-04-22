import { useEffect, useMemo, useState } from "react";
import { backend } from "../../services/backend";

const initialSensors = {
  temperature: 78,
  vibration: 4.6,
  pressure: 36,
  humidity: 50,
  rpm: 1850,
  voltage: 228,
  current: 15,
  runtimeHours: 2200,
  errorCount: 1,
  maintenanceLagDays: 14
};

const sensorFields = [
  ["temperature", "Temperature (C)"],
  ["vibration", "Vibration (mm/s)"],
  ["pressure", "Pressure (bar)"],
  ["humidity", "Humidity (%)"],
  ["rpm", "RPM"],
  ["voltage", "Voltage (V)"],
  ["current", "Current (A)"],
  ["runtimeHours", "Runtime Hours"],
  ["errorCount", "Error Count"],
  ["maintenanceLagDays", "Maintenance Lag (Days)"]
];

export default function UserDashboardPage() {
  const [machines, setMachines] = useState([]);
  const [selectedMachineId, setSelectedMachineId] = useState("");
  const [sensors, setSensors] = useState(initialSensors);
  const [latestPrediction, setLatestPrediction] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const riskBadgeClass = useMemo(() => {
    if (!latestPrediction) return "";
    return `risk-badge risk-${String(latestPrediction.riskLevel).toLowerCase()}`;
  }, [latestPrediction]);

  async function load() {
    setError("");
    try {
      const [mRes, hRes] = await Promise.all([
        backend.listMachines(),
        backend.listPredictions(25)
      ]);
      setMachines(mRes || []);
      setHistory(hRes || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function predict(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload = { ...sensors, machineId: selectedMachineId || undefined };
      const res = await backend.createPrediction(payload);
      setLatestPrediction(res);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="user-page">
      <div className="user-head">
        <h1>User Dashboard</h1>
        <button type="button" className="btn-secondary" onClick={load}>
          Refresh
        </button>
      </div>

      {error && <div className="banner banner-danger">{error}</div>}

      <div className="two-col">
        <section className="panel">
          <div className="panel-head">
            <div className="panel-title">Run Prediction</div>
            <div className="panel-sub">Backend sends features to ML API and returns risk.</div>
          </div>
          <form onSubmit={predict} className="form-grid">
            <label>
              <span>Machine</span>
              <select
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
            </label>

            {sensorFields.map(([field, label]) => (
              <label key={field}>
                <span>{label}</span>
                <input
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

            <div className="form-actions">
              <button type="submit" disabled={loading}>
                {loading ? "Predicting…" : "Predict Failure Risk"}
              </button>
            </div>
          </form>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div className="panel-title">Latest Prediction</div>
            <div className="panel-sub">Live result</div>
          </div>
          {latestPrediction ? (
            <div className="prediction-result">
              <p className={riskBadgeClass}>{latestPrediction.riskLevel} Risk</p>
              <p>
                Failure Probability:{" "}
                <strong>
                  {(latestPrediction.failureProbability * 100).toFixed(2)}%
                </strong>
              </p>
              <p>{latestPrediction.recommendation}</p>
              <small>Model: {latestPrediction.modelVersion}</small>
            </div>
          ) : (
            <p className="muted">No prediction generated yet.</p>
          )}
        </section>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div className="panel-title">Prediction History</div>
          <div className="panel-sub">Your recent predictions</div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Machine</th>
                <th>Risk</th>
                <th>Probability</th>
                <th>Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={row._id}>
                  <td>{new Date(row.predictedAt).toLocaleString()}</td>
                  <td>{row.machine?.name || "-"}</td>
                  <td>{row.riskLevel}</td>
                  <td>{(row.failureProbability * 100).toFixed(2)}%</td>
                  <td className="cell-wrap">{row.recommendation}</td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    No history yet.
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

