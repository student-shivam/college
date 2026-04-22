const navItems = [
  { key: "dashboard", label: "Dashboard", icon: "DB" },
  { key: "add-machine", label: "Add Machine", icon: "AM" },
  { key: "user-management", label: "User Management", icon: "UM" },
  { key: "prediction", label: "Prediction", icon: "PR" },
  { key: "history", label: "History", icon: "HS" },
  { key: "settings", label: "Settings", icon: "ST" },
  { key: "logout", label: "Logout", icon: "LG" }
];

export default function AdminShell({
  user,
  activeView,
  onNavigate,
  onLogout,
  profileOpen,
  setProfileOpen,
  initials,
  children
}) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar" aria-label="Admin navigation">
        <div className="admin-sidebar-head">
          <div className="admin-sidebar-avatar" aria-hidden="true">
            PM
          </div>
          <div className="admin-sidebar-head-text">
            <div className="admin-sidebar-kicker">PREDICTIVE</div>
            <div className="admin-sidebar-h1">Maintenance</div>
          </div>
        </div>

        <nav className="admin-nav">
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={[
                item.key === "logout" ? "danger" : "",
                activeView === item.key ? "active" : ""
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => (item.key === "logout" ? onLogout() : onNavigate(item.key))}
            >
              <span className="admin-nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="admin-nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar-title">Predictive Maintenance System</div>

          <div className="topbar-actions" data-profile-root="true">
            <button type="button" className="admin-icon-btn" title="Theme">
              <span aria-hidden="true">◐</span>
            </button>
            <button type="button" className="admin-icon-btn" title="Notifications">
              <span aria-hidden="true">●</span>
            </button>
            <button
              type="button"
              className="profile-btn"
              aria-haspopup="menu"
              aria-expanded={profileOpen}
              onClick={() => setProfileOpen((v) => !v)}
              title="Profile"
            >
              <span className="avatar">{initials}</span>
            </button>

            {profileOpen && (
              <div className="profile-menu" role="menu">
                <div className="profile-meta">
                  <div className="profile-name">{user?.name}</div>
                  <div className="profile-role">{user?.role}</div>
                </div>
                <button type="button" className="profile-logout" onClick={onLogout}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="admin-content">{children}</div>
      </main>
    </div>
  );
}
