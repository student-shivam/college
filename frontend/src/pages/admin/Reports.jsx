export default function AdminReportsPage() {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-kicker">ADMIN</div>
          <h1>Reports & Analytics</h1>
          <p className="muted">Generate and export reports (API-ready).</p>
        </div>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div className="panel-title">Reports</div>
          <div className="panel-sub">Integrate export endpoints (CSV/PDF) later.</div>
        </div>
        <div className="btn-row">
          <button type="button" disabled>
            Generate Report
          </button>
          <button type="button" className="btn-secondary" disabled>
            Export CSV
          </button>
        </div>
      </section>
    </div>
  );
}

