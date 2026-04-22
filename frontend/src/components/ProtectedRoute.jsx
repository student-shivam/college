import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function ProtectedRoute({ requireRole }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="app-loading">
        <div className="app-loading-card">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  if (requireRole && user.role !== requireRole) {
    const fallback = user.role === "admin" ? "/admin/dashboard" : "/user/dashboard";
    return <Navigate to={fallback} replace />;
  }

  return <Outlet />;
}

