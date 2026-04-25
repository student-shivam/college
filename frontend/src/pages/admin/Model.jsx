import { useEffect, useMemo, useState } from "react";
import { backend } from "../../services/backend";
import { toast } from "../../utils/toastBus";
import { toUiErrorMessage } from "../../utils/toUiErrorMessage";

function getAxiosErrorMessage(err) {
  const status = err?.response?.status;

  if (status === 404) {
    return "Model service is unavailable right now.";
  }

  return toUiErrorMessage(err);
}

function formatDate(value) {
  if (!value) return "-";
  const date = typeof value === "string" || typeof value === "number" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function formatNumber(value, digits = 4) {
  if (value === null || value === undefined) return "-";
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return n.toFixed(digits);
}

export default function AdminModelPage() {
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  async function loadStatus({ silent = false } = {}) {
    if (!silent) setLoading(true);
    try {
      const res = await backend.getModelStatus();
      setMeta(res);
    } catch (err) {
      toast.error(getAxiosErrorMessage(err), { dedupeKey: "admin-model-load" });
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    if (!meta || meta.status !== "Training") return;
    const t = setInterval(() => loadStatus({ silent: true }), 1500);
    return () => clearInterval(t);
  }, [meta?.status]);

  const canRun = meta?.status !== "Training";

  async function onTrain() {
    setActionLoading(true);
    try {
      await backend.trainModel();
      toast.success("Training started.");
      await loadStatus({ silent: true });
    } catch (err) {
      toast.error(getAxiosErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  }

  async function onUpdate() {
    setActionLoading(true);
    try {
      await backend.updateModel();
      toast.success("Model update started.");
      await loadStatus({ silent: true });
    } catch (err) {
      toast.error(getAxiosErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  }

  const progress = useMemo(() => {
    const raw = Number(meta?.progress) || 0;
    return Math.min(Math.max(raw, 0), 100);
  }, [meta?.progress]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-kicker">ADMIN</div>
          <h1>Model Management</h1>
          <p className="muted">
            Train and update the ML model via Node.js to ML API. Status persists even if MongoDB is
            unavailable.
          </p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn-secondary" onClick={() => loadStatus()} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-title">Training Controls</div>
            <div className="panel-sub">
              Uses MongoDB data when available; falls back to synthetic training data for a clean demo
              experience.
            </div>
          </div>
          <div className="btn-row">
            <button type="button" onClick={onTrain} disabled={!canRun || actionLoading}>
              {meta?.status === "Training" ? "Training..." : "Train Model"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={onUpdate}
              disabled={!canRun || actionLoading}
            >
              Update Model
            </button>
          </div>
        </div>

        <div className="model-status-row">
          <div className="model-status-left">
            <div className="model-status-label">Status</div>
            <div className="model-status-pill" data-status={meta?.status || "Idle"}>
              {meta?.status || "Idle"}
            </div>
          </div>
          <div className="model-status-right">
            {meta?.status === "Training" && (
              <div className="model-progress">
                <div className="model-progress-head">
                  <div className="model-progress-label">Training progress</div>
                  <div className="model-progress-value">{progress}%</div>
                </div>
                <div className="model-progress-track" role="progressbar" aria-valuenow={progress}>
                  <div className="model-progress-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
            {meta?.status === "Failed" && meta?.lastError && (
              <div className="model-error">Last error: {meta.lastError}</div>
            )}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-title">Model Metrics</div>
            <div className="panel-sub">Latest training snapshot stored by the backend.</div>
          </div>
        </div>

        <div className="model-metrics-grid">
          <div className="model-metric">
            <div className="model-metric-kicker">Accuracy</div>
            <div className="model-metric-value">{formatNumber(meta?.accuracy, 4)}</div>
          </div>
          <div className="model-metric">
            <div className="model-metric-kicker">Loss</div>
            <div className="model-metric-value">{formatNumber(meta?.loss, 4)}</div>
          </div>
          <div className="model-metric">
            <div className="model-metric-kicker">Last Trained</div>
            <div className="model-metric-value">{formatDate(meta?.lastTrainedAt)}</div>
          </div>
          <div className="model-metric">
            <div className="model-metric-kicker">Model Version</div>
            <div className="model-metric-value">{meta?.modelVersion || "-"}</div>
          </div>
        </div>
      </section>
    </div>
  );
}
