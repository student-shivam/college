import { useEffect, useMemo, useState } from "react";
import { backend } from "../../services/backend";
import { toast } from "../../utils/toastBus";
import { toUiErrorMessage } from "../../utils/toUiErrorMessage";

export default function UserMachinesPage() {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  async function load() {
    setLoading(true);
    try {
      const list = await backend.listMachines();
      setMachines(list || []);
    } catch (err) {
      toast.error(toUiErrorMessage(err), { dedupeKey: "user-machines-load" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return machines;
    return (machines || []).filter((m) => {
      const name = String(m.name || "").toLowerCase();
      const location = String(m.location || "").toLowerCase();
      const model = String(m.modelNumber || "").toLowerCase();
      return name.includes(q) || location.includes(q) || model.includes(q);
    });
  }, [machines, query]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-kicker">USER</div>
          <h1>Machines</h1>
          <p className="muted">Browse available machines.</p>
        </div>
        <div className="page-actions">
          <input
            className="search"
            placeholder="Search name / location / model"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="button" className="btn-secondary" onClick={load} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div className="panel-title">All Machines</div>
          <div className="panel-sub">{loading ? "Loading..." : `${filtered.length} records`}</div>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Location</th>
                <th>Model</th>
                <th>Installed</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m._id}>
                  <td>{m.name}</td>
                  <td>{m.location || "-"}</td>
                  <td>{m.modelNumber || "-"}</td>
                  <td>{m.installedAt ? new Date(m.installedAt).toLocaleDateString() : "-"}</td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="muted">
                    No machines found.
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
