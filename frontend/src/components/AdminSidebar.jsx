import { NavLink } from "react-router-dom";

const items = [
  { to: "/admin/dashboard", label: "Dashboard", icon: "DB" },
  { to: "/admin/users", label: "User Management", icon: "US" },
  { to: "/admin/machines", label: "Machine Management", icon: "MC" },
  { to: "/admin/data", label: "Data Management", icon: "DT" },
  { to: "/admin/model", label: "Model Management", icon: "ML" },
  { to: "/admin/predictions", label: "Predictions Monitor", icon: "PR" },
  { to: "/admin/alerts", label: "Alerts Management", icon: "AL" },
  { to: "/admin/logs", label: "Logs & Activity", icon: "LG" },
  { to: "/admin/reports", label: "Reports & Analytics", icon: "RP" },
  { to: "/admin/settings", label: "Settings", icon: "ST" }
];

export default function AdminSidebar({ collapsed, mobileOpen, onClose }) {
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
        <div className="saas-sidebar-brand">
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
            >
              <span className="saas-nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="saas-nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="saas-sidebar-foot">
          <div className="saas-foot-note">SaaS Admin Console</div>
        </div>
      </aside>

      {mobileOpen && <button className="saas-backdrop" type="button" onClick={onClose} />}
    </>
  );
}
