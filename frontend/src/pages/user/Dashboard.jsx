import { useEffect, useMemo, useState } from "react";
import { backend } from "../../services/backend";
import LineChart from "../../components/charts/LineChart";
import DonutChart from "../../components/charts/DonutChart";
import Sparkline from "../../components/charts/Sparkline";

const DASH = "\u2014";
const ELLIPSIS = "\u2026";
const DOT = "\u00B7";

function probToPct(value) {
  if (typeof value !== "number") return DASH;
  return `${(value * 100).toFixed(0)}%`;
}

function trendIcon(trend) {
  if (trend === "up") return "\u2191";
  if (trend === "down") return "\u2193";
  return "\u2192";
}

export default function UserDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    setError("");
    setLoading(true);
    try {
      const next = await backend.getUserDashboardOverview({
        days: 7,
        alertLimit: 6,
        topLimit: 6
      });
      setData(next);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;
    refresh();

    let es = null;
    try {
      es = backend.openUserDashboardStream({
        days: 7,
        alertLimit: 6,
        topLimit: 6,
        intervalMs: 2500,
        onSnapshot: (snap) => {
          if (!alive) return;
          setData(snap);
          setLive(true);
        },
        onError: () => {
          if (!alive) return;
          setLive(false);
        }
      });
    } catch (_err) {
      // stream not available
    }

    return () => {
      alive = false;
      es?.close();
    };
  }, []);

  const lineSeries = useMemo(
    () => [
      { key: "Healthy", label: "Healthy", color: "#28d17c" },
      { key: "Warning", label: "Warning", color: "#ffbf3a" },
      { key: "Critical", label: "Critical", color: "#ff4a5b" }
    ],
    []
  );

  const cards = useMemo(() => {
    const trend = Array.isArray(data?.trend) ? data.trend : [];
    const h = trend.map((d) => d.Healthy);
    const w = trend.map((d) => d.Warning);
    const c = trend.map((d) => d.Critical);

    return [
      {
        label: "Tracked Machines",
        value: data?.cards?.trackedMachines ?? DASH,
        spark: h.map((v, idx) => v + (w[idx] || 0) + (c[idx] || 0))
      },
      { label: "Healthy", value: data?.cards?.Healthy ?? 0, spark: h, tone: "ok" },
      { label: "Warning", value: data?.cards?.Warning ?? 0, spark: w, tone: "warn" },
      { label: "Critical", value: data?.cards?.Critical ?? 0, spark: c, tone: "danger" }
    ];
  }, [data]);

  const donutSegments = useMemo(() => {
    const dist = data?.distribution || {};
    return [
      { label: "Healthy", value: dist.Healthy || 0, color: "#28d17c" },
      { label: "Warning", value: dist.Warning || 0, color: "#ffbf3a" },
      { label: "Critical", value: dist.Critical || 0, color: "#ff4a5b" },
      { label: "Unknown", value: dist.Unknown || 0, color: "rgba(235,241,255,0.28)" }
    ].filter((s) => s.value > 0);
  }, [data]);

  return (
    <div className="page dashboard-page">
      <div className="page-head">
        <div>
          <div className="page-kicker">USER</div>
          <h1>Dashboard</h1>
          <p className="muted">
            Live overview for your machines{" "}
            <span className={["dash-live", live ? "is-live" : ""].filter(Boolean).join(" ")}>
              {live ? "LIVE" : "OFFLINE"}
            </span>
          </p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn-secondary" onClick={refresh} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && <div className="banner banner-danger">{error}</div>}

      <section className="dashboard-kpis">
        {cards.map((card) => (
          <article
            key={card.label}
            className={["dash-kpi", `tone-${card.tone || "base"}`].join(" ")}
          >
            <div className="dash-kpi-top">
              <div className="kpi-label">{card.label}</div>
              <Sparkline
                values={card.spark}
                color={
                  card.tone === "danger"
                    ? "#ff4a5b"
                    : card.tone === "warn"
                      ? "#ffbf3a"
                      : card.tone === "ok"
                        ? "#28d17c"
                        : "rgba(122, 53, 223, 0.95)"
                }
              />
            </div>
            <div className="kpi-value">{loading && !data ? ELLIPSIS : card.value}</div>
          </article>
        ))}
      </section>

      <section className="dashboard-mid">
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Machine Health Overview</div>
              <div className="panel-sub">Last 7 days prediction volume by status</div>
            </div>
            <div className="dash-legend">
              {lineSeries.map((s) => (
                <div key={s.key} className="dash-legend-item">
                  <span className="dash-legend-dot" style={{ background: s.color }} />
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
          <LineChart data={data?.trend || []} series={lineSeries} height={240} />
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Risk Distribution</div>
              <div className="panel-sub">Current machine status split</div>
            </div>
          </div>

          <div className="dash-donut">
            <DonutChart
              segments={donutSegments}
              centerLabel="Machines"
              centerValue={data?.cards?.trackedMachines}
            />
            <div className="dash-donut-legend">
              {[
                { key: "Healthy", label: "Healthy", color: "#28d17c" },
                { key: "Warning", label: "Warning", color: "#ffbf3a" },
                { key: "Critical", label: "Critical", color: "#ff4a5b" },
                { key: "Unknown", label: "Unknown", color: "rgba(235,241,255,0.28)" }
              ].map((item) => (
                <div key={item.key} className="dash-donut-row">
                  <span className="dash-legend-dot" style={{ background: item.color }} />
                  <span className="dash-donut-name">{item.label}</span>
                  <span className="dash-donut-value">{data?.distribution?.[item.key] ?? 0}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="dashboard-bottom">
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Recent Alerts</div>
              <div className="panel-sub">Events triggered from your predictions</div>
            </div>
            <div className="panel-sub">{data?.now ? new Date(data.now).toLocaleString() : ""}</div>
          </div>

          <div className="dash-alerts">
            {(data?.recentAlerts || []).map((a) => (
              <div key={a._id} className="dash-alert">
                <div className="dash-alert-left">
                  <span className={`sev sev-${String(a.severity || "High").toLowerCase()}`}>
                    {a.severity}
                  </span>
                  <div className="dash-alert-msg">
                    <div className="dash-alert-title">{a.message || "Alert triggered"}</div>
                    <div className="dash-alert-sub">
                      {a.machine?.name ? a.machine.name : "Unknown machine"} {DOT}{" "}
                      {a.triggeredAt ? new Date(a.triggeredAt).toLocaleString() : ""}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {(data?.recentAlerts || []).length === 0 && (
              <div className="muted">No alerts yet.</div>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Top At Risk Machines</div>
              <div className="panel-sub">Based on your latest predictions</div>
            </div>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Machine</th>
                  <th>Status</th>
                  <th>Probability</th>
                  <th>Trend</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {(data?.topAtRisk || []).map((row) => (
                  <tr key={row.machineId}>
                    <td>{row.name || DASH}</td>
                    <td>
                      <span
                        className={`status status-${String(row.status || "unknown").toLowerCase()}`}
                      >
                        {row.status || "Unknown"}
                      </span>
                    </td>
                    <td>{probToPct(row.failureProbability)}</td>
                    <td className="dash-trend">{trendIcon(row.trend)}</td>
                    <td>{row.predictedAt ? new Date(row.predictedAt).toLocaleString() : DASH}</td>
                  </tr>
                ))}
                {(data?.topAtRisk || []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="muted">
                      No predictions yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

