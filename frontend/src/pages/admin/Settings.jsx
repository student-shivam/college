export default function AdminSettingsPage() {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-kicker">ADMIN</div>
          <h1>Settings</h1>
          <p className="muted">System settings, API keys, and integrations (API-ready).</p>
        </div>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div className="panel-title">Configuration</div>
          <div className="panel-sub">
            Add backend settings endpoints and secure storage before enabling edits.
          </div>
        </div>
        <div className="empty">
          <div className="empty-title">Settings are not editable yet</div>
          <div className="empty-sub">Waiting for backend integration.</div>
        </div>
      </section>
    </div>
  );
}

