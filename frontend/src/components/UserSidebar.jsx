import { NavLink } from "react-router-dom";

const items = [
  { to: "/user/dashboard", label: "Dashboard", icon: "DB" },
  { to: "/user/machines", label: "Machines", icon: "MC" },
  { to: "/user/predictions", label: "Predictions", icon: "PR" },
  { to: "/user/settings", label: "Settings", icon: "ST" }
];

export default function UserSidebar({ collapsed, mobileOpen, onClose }) {
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
          <div className="saas-foot-note">User Console</div>
        </div>
      </aside>

      {mobileOpen && <button className="saas-backdrop" type="button" onClick={onClose} />}
    </>
  );
}

