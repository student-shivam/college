import { NavLink } from "react-router-dom";
import {
  FiActivity,
  FiAlertTriangle,
  FiBarChart2,
  FiClipboard,
  FiCpu,
  FiDatabase,
  FiGrid,
  FiMenu,
  FiSettings,
  FiShield,
  FiUsers
} from "react-icons/fi";

const items = [
  { to: "/admin/dashboard", label: "Dashboard", Icon: FiGrid },
  { to: "/admin/users", label: "User Management", Icon: FiUsers },
  { to: "/admin/machines", label: "Machine Management", Icon: FiCpu },
  { to: "/admin/data", label: "Data Management", Icon: FiDatabase },
  { to: "/admin/model", label: "Model Management", Icon: FiShield },
  { to: "/admin/predictions", label: "Predictions Monitor", Icon: FiActivity },
  { to: "/admin/alerts", label: "Alerts Management", Icon: FiAlertTriangle },
  { to: "/admin/logs", label: "Logs & Activity", Icon: FiClipboard },
  { to: "/admin/reports", label: "Reports & Analytics", Icon: FiBarChart2 },
  { to: "/admin/settings", label: "Settings", Icon: FiSettings }
];

export default function Sidebar({ collapsed, mobileOpen, onClose, onToggle }) {
  return (
    <>
      <aside
        className={[
          "saas-sidebar",
          collapsed ? "is-collapsed" : "",
          mobileOpen ? "is-mobile-open" : ""
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label="Admin navigation"
      >
        <button
          type="button"
          className="saas-collapse-btn"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggle?.();
          }}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label="Toggle sidebar"
        >
          <FiMenu />
        </button>

        <div className="saas-sidebar-brand" title={collapsed ? "Predictive Maintenance" : undefined}>
          <div className="saas-logo" aria-hidden="true">
            PM
          </div>
          <div className="saas-brand-text">
            <div className="saas-brand-kicker">PREDICTIVE</div>
            <div className="saas-brand-title">Maintenance</div>
          </div>
        </div>

        <nav className="saas-nav" onClick={onClose}>
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                ["saas-nav-item", isActive ? "active" : ""].filter(Boolean).join(" ")
              }
              end
              title={collapsed ? item.label : undefined}
              data-tooltip={collapsed ? item.label : undefined}
            >
              <span className="saas-nav-icon" aria-hidden="true">
                <item.Icon />
              </span>
              <span className="saas-nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="saas-sidebar-foot">
          <div className="saas-foot-note">Admin Console</div>
        </div>
      </aside>

      {mobileOpen && <button className="saas-backdrop" type="button" onClick={onClose} />}
    </>
  );
}
