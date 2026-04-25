import { NavLink } from "react-router-dom";
import { FiActivity, FiCpu, FiGrid, FiMenu, FiSettings } from "react-icons/fi";

const items = [
  { to: "/user/dashboard", label: "Dashboard", Icon: FiGrid },
  { to: "/user/machines", label: "Machines", Icon: FiCpu },
  { to: "/user/predictions", label: "Predictions", Icon: FiActivity },
  { to: "/user/settings", label: "Settings", Icon: FiSettings }
];

export default function UserSidebar({ collapsed, mobileOpen, onClose, onToggle }) {
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
        aria-label="User navigation"
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
          <div className="saas-foot-note">User Console</div>
        </div>
      </aside>

      {mobileOpen && <button className="saas-backdrop" type="button" onClick={onClose} />}
    </>
  );
}
