import { useEffect, useMemo, useState } from "react";
import { backend } from "../../services/backend";

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [snapshot, setSnapshot] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    backend
      .getAdminSnapshot()
      .then((data) => {
        if (!alive) return;
        setSnapshot(data);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err.response?.data?.message || err.message);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const cards = useMemo(() => {
    const dash = snapshot?.dashboard;
    const totalMachines = dash?.totalMachines ?? null;
    const activeUsers = Array.isArray(snapshot?.users) ? snapshot.users.length : null;
    const criticalAlerts = dash?.riskCounts ? dash.riskCounts.Critical : null;
    return [
      { label: "Total Machines", value: totalMachines ?? "—" },
      { label: "Active Users", value: activeUsers ?? "—" },
      { label: "Critical Alerts", value: criticalAlerts ?? "—", tone: "danger" }
    ];
  }, [snapshot]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-kicker">ADMIN</div>
          <h1>Dashboard</h1>
          <p className="muted">Overview of machines, users, and system risk.</p>
        </div>
      </div>

      {error && <div className="banner banner-danger">{error}</div>}

      <section className="card-grid">
        {cards.map((card) => (
          <article
            key={card.label}
            className={["kpi-card", card.tone ? `is-${card.tone}` : ""]
              .filter(Boolean)
              .join(" ")}
          >
            <div className="kpi-label">{card.label}</div>
            <div className="kpi-value">{loading ? "…" : card.value}</div>
          </article>
        ))}
      </section>

      <section className="panel">
        <div className="panel-head">
          <div className="panel-title">Risk Summary</div>
          <div className="panel-sub">Based on last 100 predictions.</div>
        </div>

        <div className="risk-row">
          {["Low", "Medium", "High", "Critical"].map((level) => (
            <div key={level} className="risk-pill">
              <span className="risk-dot" data-level={level} aria-hidden="true" />
              <span className="risk-name">{level}</span>
              <span className="risk-count">
                {loading ? "…" : snapshot?.dashboard?.riskCounts?.[level] ?? 0}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

