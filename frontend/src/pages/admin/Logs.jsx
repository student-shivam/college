export default function AdminLogsPage() {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-kicker">ADMIN</div>
          <h1>Logs & Activity</h1>
          <p className="muted">Audit logs and login history (API-ready).</p>
        </div>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div className="panel-title">Activity Feed</div>
          <div className="panel-sub">Add backend audit log endpoints to populate this view.</div>
        </div>
        <div className="empty">
          <div className="empty-title">No logs available</div>
          <div className="empty-sub">Waiting for backend integration.</div>
        </div>
      </section>
    </div>
  );
}

