import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FiChevronDown, FiLogOut, FiMenu, FiMoon, FiSettings, FiSun } from "react-icons/fi";
import { useAuth } from "../auth/AuthProvider";
import { toServiceUrl } from "../utils/serviceRoot";

function getInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first = parts[0]?.[0] || "A";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (first + last).toUpperCase();
}

export default function Navbar({
  theme,
  onToggleTheme,
  onToggleSidebar,
  settingsPath = "/admin/settings",
  profilePath = "/admin/profile"
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const rootRef = useRef(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const initials = useMemo(() => getInitials(user?.name), [user?.name]);
  const avatarSrc = useMemo(() => toServiceUrl(user?.avatarUrl), [user?.avatarUrl]);

  useEffect(() => {
    setProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function onDocClick(e) {
      const root = rootRef.current;
      if (!root) return;
      if (root.contains(e.target)) return;
      setProfileOpen(false);
    }

    function onKeyDown(e) {
      if (e.key === "Escape") setProfileOpen(false);
    }

    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <header className="saas-topbar saas-topbar-fixed" ref={rootRef}>
      <div className="saas-topbar-left">
        <div className="saas-topbar-title">Predictive Maintenance System</div>
      </div>

      <div className="saas-topbar-right">
        <button
          type="button"
          className="saas-icon-btn"
          onClick={onToggleTheme}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <FiMoon /> : <FiSun />}
        </button>

        <button
          type="button"
          className="saas-avatar-btn"
          onClick={() => navigate(profilePath)}
          title="Profile"
        >
          <span className="saas-avatar">
            {avatarSrc ? <img src={avatarSrc} alt="Profile" /> : initials}
          </span>
        </button>

        <button
          type="button"
          className="saas-icon-btn"
          aria-haspopup="menu"
          aria-expanded={profileOpen}
          onClick={() => setProfileOpen((v) => !v)}
          title="Account menu"
          aria-label="Account menu"
        >
          <FiChevronDown />
        </button>

        {profileOpen && (
          <div className="saas-menu" role="menu">
            <div className="saas-menu-meta">
              <div className="saas-menu-name">{user?.name || "Admin"}</div>
              <div className="saas-menu-role">{user?.role || "admin"}</div>
            </div>
            <button
              type="button"
              className="saas-menu-item"
              onClick={() => navigate(settingsPath)}
            >
              <span className="saas-menu-ic" aria-hidden="true">
                <FiSettings />
              </span>
              Settings
            </button>
            <button
              type="button"
              className="saas-menu-item danger"
              onClick={() => {
                logout();
                navigate("/auth", { replace: true });
              }}
            >
              <span className="saas-menu-ic" aria-hidden="true">
                <FiLogOut />
              </span>
              Logout
            </button>
          </div>
        )}

        <button
          type="button"
          className="saas-icon-btn saas-mobile-only"
          onClick={onToggleSidebar}
          title="Menu"
          aria-label="Open menu"
        >
          <FiMenu />
        </button>
      </div>
    </header>
  );
}
