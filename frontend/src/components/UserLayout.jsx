import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import UserSidebar from "./UserSidebar";

export default function UserLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const initials = useMemo(() => {
    const parts = String(user?.name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const first = parts[0]?.[0] || "U";
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
    return (first + last).toUpperCase();
  }, [user?.name]);

  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") {
        setMobileOpen(false);
        setProfileOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className={["saas-shell", collapsed ? "sidebar-collapsed" : ""].join(" ")}>
      <UserSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <main className="saas-main">
        <header className="saas-topbar" data-profile-root="true">
          <div className="saas-topbar-left">
            <button
              type="button"
              className="saas-icon-btn"
              onClick={() => setMobileOpen(true)}
              title="Open menu"
            >
              ☰
            </button>
            <button
              type="button"
              className="saas-icon-btn"
              onClick={() => setCollapsed((v) => !v)}
              title="Collapse sidebar"
            >
              ⫶
            </button>
            <div className="saas-topbar-title">Predictive Maintenance System</div>
          </div>

          <div className="saas-topbar-right">
            <button type="button" className="saas-icon-btn" title="Theme" disabled>
              ◐
            </button>
            <button type="button" className="saas-icon-btn" title="Notifications" disabled>
              ●
            </button>

            <button
              type="button"
              className="saas-avatar-btn"
              aria-haspopup="menu"
              aria-expanded={profileOpen}
              onClick={() => setProfileOpen((v) => !v)}
              title="Profile"
            >
              <span className="saas-avatar">{initials}</span>
            </button>

            {profileOpen && (
              <div className="saas-menu" role="menu">
                <div className="saas-menu-meta">
                  <div className="saas-menu-name">{user?.name}</div>
                  <div className="saas-menu-role">{user?.role}</div>
                </div>
                <button
                  type="button"
                  className="saas-menu-item danger"
                  onClick={() => {
                    logout();
                    navigate("/auth", { replace: true });
                  }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="saas-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
