import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import UserLayout from "./components/UserLayout";
import AuthPage from "./pages/Auth";

import AdminDashboardPage from "./pages/admin/Dashboard";
import AdminUsersPage from "./pages/admin/Users";
import AdminMachinesPage from "./pages/admin/Machines";
import AdminDataPage from "./pages/admin/Data";
import AdminModelPage from "./pages/admin/Model";
import AdminPredictionsPage from "./pages/admin/Predictions";
import AdminAlertsPage from "./pages/admin/Alerts";
import AdminLogsPage from "./pages/admin/Logs";
import AdminReportsPage from "./pages/admin/Reports";
import AdminSettingsPage from "./pages/admin/Settings";
import AdminProfilePage from "./pages/admin/Profile";

import UserDashboardPage from "./pages/user/Dashboard";
import UserMachinesPage from "./pages/user/Machines";
import UserPredictionsPage from "./pages/user/Predictions";
import UserSettingsPage from "./pages/user/Settings";
import UserProfilePage from "./pages/user/Profile";

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  return <Navigate to={user.role === "admin" ? "/admin/dashboard" : "/user/dashboard"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/auth" element={<AuthPage />} />

      <Route element={<ProtectedRoute requireRole="admin" />}>
        <Route path="/admin" element={<Layout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="machines" element={<AdminMachinesPage />} />
          <Route path="data" element={<AdminDataPage />} />
          <Route path="model" element={<AdminModelPage />} />
          <Route path="predictions" element={<AdminPredictionsPage />} />
          <Route path="alerts" element={<AdminAlertsPage />} />
          <Route path="logs" element={<AdminLogsPage />} />
          <Route path="reports" element={<AdminReportsPage />} />
          <Route path="profile" element={<AdminProfilePage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute requireRole="user" />}>
        <Route path="/user" element={<UserLayout />}>
          <Route index element={<Navigate to="/user/dashboard" replace />} />
          <Route path="dashboard" element={<UserDashboardPage />} />
          <Route path="machines" element={<UserMachinesPage />} />
          <Route path="predictions" element={<UserPredictionsPage />} />
          <Route path="profile" element={<UserProfilePage />} />
          <Route path="settings" element={<UserSettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
