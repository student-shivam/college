import { useEffect, useMemo, useState } from "react";
import { backend } from "../../services/backend";

export default function AdminMachinesPage() {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    location: "",
    modelNumber: "",
    installedAt: ""
  });

  function closeModal() {
    setModalOpen(false);
    setForm({ name: "", location: "", modelNumber: "", installedAt: "" });
    setError("");
  }

  async function load() {
    setLoading(true);
    setStatus("");
    setError("");
    try {
      const list = await backend.listMachines();
      setMachines(list || []);
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
    if (!q) return machines;
    return (machines || []).filter((m) => {
      const name = String(m.name || "").toLowerCase();
      const location = String(m.location || "").toLowerCase();
      const model = String(m.modelNumber || "").toLowerCase();
      return name.includes(q) || location.includes(q) || model.includes(q);
    });
  }, [machines, query]);

  async function onCreate(e) {
    e.preventDefault();
    setStatus("");
    setError("");
    try {
      if (!form.name.trim()) {
        setError("Machine name is required");
        return;
      }

      const payload = {
        name: form.name.trim(),
        location: form.location,
        modelNumber: form.modelNumber,
        installedAt: form.installedAt ? new Date(form.installedAt).toISOString() : undefined
      };

      await backend.createMachine(payload);
      setStatus("Machine created");
      closeModal();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-kicker">ADMIN</div>
          <h1>Machine Management</h1>
          <p className="muted">Add machines and manage configuration (API-ready).</p>
        </div>
      </div>

      {error && <div className="banner banner-danger">{error}</div>}
      {status && <div className="banner banner-success">{status}</div>}

      <article className="admin-card">
        <div className="admin-user-toolbar">
          <div className="admin-user-title">
            <h2>Machines</h2>
            <div className="admin-muted">
              Total machines: <strong>{machines.length}</strong>
            </div>
          </div>

          <div className="admin-user-controls">
            <input
              className="admin-user-search"
              placeholder="Search name / location / model"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="admin-user-buttons">
              <button type="button" onClick={() => setModalOpen(true)}>
                Add Machine
              </button>
              <button
                type="button"
                className="admin-secondary"
                onClick={load}
                disabled={loading}
              >
                {loading ? "Loading..." : "Refresh"}
              </button>
            </div>
          </div>
        </div>

        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Location</th>
                <th>Model</th>
                <th>Installed</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m._id}>
                  <td>{m.name}</td>
                  <td>{m.location || "-"}</td>
                  <td>{m.modelNumber || "-"}</td>
                  <td>
                    {m.installedAt ? new Date(m.installedAt).toLocaleDateString() : "-"}
                  </td>
                  <td>{m.createdAt ? new Date(m.createdAt).toLocaleDateString() : "-"}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="admin-muted">
                    No machines found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>

      {modalOpen && (
        <div
          className="admin-modal"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="admin-modal-panel">
            <div className="admin-modal-head">
              <div>
                <div className="admin-card-kicker">CREATE MACHINE</div>
                <h2>Add Machine</h2>
              </div>
              <button
                type="button"
                className="admin-modal-close"
                onClick={closeModal}
                title="Close"
              >
                X
              </button>
            </div>

            {error && <div className="admin-form-error">{error}</div>}

            <form onSubmit={onCreate} className="form-block">
              <label>
                <span>Machine Name</span>
                <input
                  placeholder="e.g. Press Line 7"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                />
              </label>
              <label>
                <span>Location</span>
                <input
                  placeholder="e.g. Plant A"
                  value={form.location}
                  onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                />
              </label>
              <label>
                <span>Model Number</span>
                <input
                  placeholder="e.g. MX-1200"
                  value={form.modelNumber}
                  onChange={(e) => setForm((p) => ({ ...p, modelNumber: e.target.value }))}
                />
              </label>
              <label>
                <span>Installed Date</span>
                <input
                  type="date"
                  value={form.installedAt}
                  onChange={(e) => setForm((p) => ({ ...p, installedAt: e.target.value }))}
                />
              </label>

              <div className="admin-actions-row">
                <button type="submit">Create Machine</button>
                <button type="button" className="admin-secondary" onClick={closeModal}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
