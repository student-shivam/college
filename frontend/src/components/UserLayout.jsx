import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function UserLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="user-shell">
      <header className="user-topbar">
        <div className="user-title">Predictive Maintenance System</div>
        <div className="user-actions">
          <div className="user-meta">
            <div className="user-name">{user?.name}</div>
            <div className="user-role">{user?.role}</div>
          </div>
          <button
            type="button"
            className="user-logout"
            onClick={() => {
              logout();
              navigate("/auth", { replace: true });
            }}
          >
            Logout
          </button>
        </div>
      </header>
      <main className="user-content">
        <Outlet />
      </main>
    </div>
  );
}

