import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function AuthPage() {
  const { user, login, signup } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "user"
  });

  const redirectTo = useMemo(() => {
    if (!user) return null;
    return user.role === "admin" ? "/admin/dashboard" : "/user/dashboard";
  }, [user]);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      const nextUser =
        mode === "login"
          ? await login({
              email: form.email,
              password: form.password,
              role: form.role
            })
          : await signup(form);

      navigate(nextUser.role === "admin" ? "/admin/dashboard" : "/user/dashboard", {
        replace: true
      });
    } catch (err) {
      if (err?.isNetworkError || !err?.response) {
        setNotice("Backend is not running. Start backend (port 5000) and then try again.");
        return;
      }
      const status = err?.response?.status;
      const message = err.response?.data?.message || err.message;
      if (status === 401) {
        setError("Invalid email or password.");
        return;
      }
      if (status === 409) {
        setError("Email already registered. Please login instead.");
        return;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Predictive Maintenance Portal</h1>
          <p>Smart maintenance. Smarter operations.</p>
        </div>

        {notice && <div className="info-box">{notice}</div>}
        {error && <div className="error-box">{error}</div>}

        <div className="auth-toggle">
          <button
            type="button"
            className={mode === "login" ? "active" : ""}
            onClick={() => setMode("login")}
          >
            Login
          </button>
          <button
            type="button"
            className={mode === "signup" ? "active" : ""}
            onClick={() => setMode("signup")}
          >
            Signup
          </button>
        </div>

        <form onSubmit={onSubmit} className="form-block">
          {mode === "signup" && (
            <input
              placeholder="Full Name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          )}
          <input
            type="email"
            placeholder="name@company.com"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
          />
          <input
            type="password"
            placeholder="Enter your password"
            value={form.password}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
          />
          <label>
            <span>Role</span>
            <select
              value={form.role}
              onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <button type="submit" disabled={loading}>
            {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
