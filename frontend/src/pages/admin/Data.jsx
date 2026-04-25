import { useEffect, useMemo, useRef, useState } from "react";
import { backend } from "../../services/backend";
import { toast } from "../../utils/toastBus";
import { toUiErrorMessage } from "../../utils/toUiErrorMessage";

export default function AdminDataPage() {
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const [machineId, setMachineId] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [result, setResult] = useState({ items: [], total: 0, pages: 1 });

  async function load({ nextPage = page, nextLimit = limit, nextMachineId = machineId } = {}) {
    setLoading(true);
    try {
      const res = await backend.listSensorData({
        page: nextPage,
        limit: nextLimit,
        machineId: nextMachineId.trim()
      });
      setResult(res);
      setHasLoaded(true);
    } catch (err) {
      toast.error(toUiErrorMessage(err), { dedupeKey: "admin-data-load" });
    } finally {
      setLoading(false);
    }
  }

  // Only load when the admin interacts (Refresh / Apply / Pagination / Upload / Delete).
  useEffect(() => {}, []);

  async function onUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error("Please choose a CSV or Excel file first.");
      return;
    }

    setUploading(true);
    try {
      const res = await backend.uploadSensorData(file);
      const rejected = res.rejectedCount ? `, ${res.rejectedCount} rejected` : "";
      toast.success(`${res.insertedCount} rows imported${rejected}.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setPage(1);
      await load({ nextPage: 1 });
    } catch (err) {
      toast.error(toUiErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  async function onDelete(id) {
    if (!window.confirm("Delete this row?")) return;
    try {
      await backend.deleteSensorData(id);
      toast.success("Row deleted.");
      await load();
    } catch (err) {
      toast.error(toUiErrorMessage(err));
    }
  }

  const items = result.items || [];

  const pageInfo = useMemo(() => {
    const total = Number(result.total) || 0;
    const pages = Number(result.pages) || 1;
    const safePage = Math.min(Math.max(page, 1), pages);
    const from = total === 0 ? 0 : (safePage - 1) * limit + 1;
    const to = Math.min(safePage * limit, total);
    return { total, pages, safePage, from, to };
  }, [result.total, result.pages, page, limit]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-kicker">ADMIN</div>
          <h1>Data Management</h1>
          <p className="muted">
            Upload sensor readings (CSV/Excel), search by machineId, and manage records.
          </p>
        </div>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-title">Upload Dataset</div>
            <div className="panel-sub">
              Columns: <code>machineId</code>, <code>temperature</code>, <code>vibration</code>,{" "}
              <code>pressure</code>, <code>timestamp</code>
            </div>
          </div>
        </div>

        <div className="upload-row">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="upload-input"
          />
          <button type="button" onClick={onUpload} disabled={uploading}>
            {uploading ? "Uploading…" : "Upload"}
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-title">Sensor Data</div>
            <div className="panel-sub">
              {!hasLoaded
                ? "Click Refresh to load data."
                : loading
                ? "Loading…"
                : `${pageInfo.total} rows • Showing ${pageInfo.from}-${pageInfo.to}`}
            </div>
          </div>
          <div className="page-actions">
            <input
              className="search"
              placeholder="Filter by machineId"
              value={machineId}
              onChange={(e) => setMachineId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setPage(1);
                  load({ nextPage: 1, nextLimit: limit, nextMachineId: machineId });
                }
              }}
            />
            <select
              className="select"
              value={limit}
              onChange={(e) => {
                const next = Number(e.target.value);
                setLimit(next);
                if (hasLoaded) {
                  setPage(1);
                  load({ nextPage: 1, nextLimit: next, nextMachineId: machineId });
                }
              }}
              title="Rows per page"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setPage(1);
                load({ nextPage: 1, nextLimit: limit, nextMachineId: machineId });
              }}
              disabled={loading}
            >
              Apply
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => load()}
              disabled={loading}
            >
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Machine</th>
                <th>Temperature</th>
                <th>Vibration</th>
                <th>Pressure</th>
                <th>Timestamp</th>
                <th style={{ width: 130 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row._id}>
                  <td>{row.machineId}</td>
                  <td>{row.temperature}</td>
                  <td>{row.vibration}</td>
                  <td>{row.pressure}</td>
                  <td>{row.timestamp ? new Date(row.timestamp).toLocaleString() : "-"}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="btn-danger"
                        onClick={() => onDelete(row._id)}
                        disabled={!hasLoaded}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && hasLoaded && items.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">
                    No data found.
                  </td>
                </tr>
              )}
              {!loading && !hasLoaded && (
                <tr>
                  <td colSpan={6} className="muted">
                    No data loaded yet. Click Refresh.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="pager">
          <button
            type="button"
            className="btn-secondary"
            disabled={!hasLoaded || pageInfo.safePage <= 1 || loading}
            onClick={() => {
              const next = Math.max(pageInfo.safePage - 1, 1);
              setPage(next);
              load({ nextPage: next });
            }}
          >
            Prev
          </button>
          <div className="pager-meta">
            Page <strong>{pageInfo.safePage}</strong> / {pageInfo.pages}
          </div>
          <button
            type="button"
            className="btn-secondary"
            disabled={!hasLoaded || pageInfo.safePage >= pageInfo.pages || loading}
            onClick={() => {
              const next = Math.min(pageInfo.safePage + 1, pageInfo.pages);
              setPage(next);
              load({ nextPage: next });
            }}
          >
            Next
          </button>
        </div>
      </section>
    </div>
  );
}
