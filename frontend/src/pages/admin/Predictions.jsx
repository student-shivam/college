import { useEffect, useMemo, useState } from "react";
import { backend } from "../../services/backend";

export default function AdminPredictionsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [predictions, setPredictions] = useState([]);
  const [query, setQuery] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const list = await backend.listPredictions(200);
      setPredictions(list || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return predictions;
    return predictions.filter((p) => {
      const machine = String(p.machine?.name || "").toLowerCase();
      const user = String(p.createdBy?.email || p.createdBy?.name || "").toLowerCase();
      const risk = String(p.riskLevel || "").toLowerCase();
      return machine.includes(q) || user.includes(q) || risk.includes(q);
    });
  }, [predictions, query]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-kicker">ADMIN</div>
          <h1>Predictions Monitor</h1>
          <p className="muted">System-wide predictions and analytics (backend calls ML API).</p>
        </div>
        <div className="page-actions">
          <input
            className="search"
            placeholder="Search machine / user / risk"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="button" className="btn-secondary" onClick={load} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      {error && <div className="banner banner-danger">{error}</div>}

      <section className="panel">
        <div className="panel-head">
          <div className="panel-title">All Predictions</div>
          <div className="panel-sub">{loading ? "Loading…" : `${filtered.length} records`}</div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Machine</th>
                <th>User</th>
                <th>Risk</th>
                <th>Probability</th>
                <th>Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row._id}>
                  <td>{row.predictedAt ? new Date(row.predictedAt).toLocaleString() : "-"}</td>
                  <td>{row.machine?.name || "-"}</td>
                  <td>{row.createdBy?.email || row.createdBy?.name || "-"}</td>
                  <td>{row.riskLevel}</td>
                  <td>
                    {typeof row.failureProbability === "number"
                      ? `${(row.failureProbability * 100).toFixed(2)}%`
                      : "-"}
                  </td>
                  <td className="cell-wrap">{row.recommendation || "-"}</td>
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

