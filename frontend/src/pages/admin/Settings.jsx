import { useEffect, useMemo, useState } from "react";
import { backend } from "../../services/backend";
import { useAuth } from "../../auth/AuthProvider";
import {
  adminPrefEvents,
  getStoredTheme,
  isAdminSidebarCollapsedStored,
  loadAdminDashboardPrefs,
  saveAdminDashboardPrefs,
  setAdminSidebarCollapsedStored,
  setStoredTheme
} from "../../utils/adminPrefs";

const ELLIPSIS = "\u2026";

function initialsFor(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first = parts[0]?.[0] || "A";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (first + last).toUpperCase();
}

export default function AdminSettingsPage() {
  const { user, refreshProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const [name, setName] = useState("");

  const [theme, setTheme] = useState(getStoredTheme());
  const [sidebarCollapsedDefault, setSidebarCollapsedDefault] = useState(
    isAdminSidebarCollapsedStored()
  );

  const [dashPrefs, setDashPrefs] = useState(() => loadAdminDashboardPrefs());

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const avatar = useMemo(() => initialsFor(user?.name), [user?.name]);

  async function load() {
    setLoading(true);
    setError("");
    setOk("");
    try {
      const me = await backend.getMe();
      const u = me?.user || me;
      setName(u?.name || user?.name || "");
      setDashPrefs(loadAdminDashboardPrefs());
      setTheme(getStoredTheme());
      setSidebarCollapsedDefault(isAdminSidebarCollapsedStored());
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function saveProfile(e) {
    e.preventDefault();
    setSavingProfile(true);
    setError("");
    setOk("");

    const nextName = String(name || "").trim();
    if (!nextName) {
      setSavingProfile(false);
      setError("Name cannot be empty.");
      return;
    }

    try {
      await backend.updateMe({ name: nextName });
      await refreshProfile();
      setOk("Profile updated.");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    setChangingPwd(true);
    setError("");
    setOk("");

    if (!currentPassword || !newPassword) {
      setChangingPwd(false);
      setError("Current password and new password are required.");
      return;
    }
    if (String(newPassword).length < 6) {
      setChangingPwd(false);
      setError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangingPwd(false);
      setError("New password and confirm password do not match.");
      return;
    }

    try {
      await backend.changeMyPassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setOk("Password updated.");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setChangingPwd(false);
    }
  }

  function saveDashboardPrefs(e) {
    e.preventDefault();
    setSavingPrefs(true);
    setError("");
    setOk("");

    try {
      const normalized = saveAdminDashboardPrefs(dashPrefs);
      setDashPrefs(normalized);
      window.dispatchEvent(new Event(adminPrefEvents.dashboardChanged));
      setOk("Admin preferences saved.");
    } catch (err) {
      setError(err.message || "Failed to save preferences.");
    } finally {
      setSavingPrefs(false);
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-kicker">ADMIN</div>
          <h1>Settings</h1>
          <p className="muted">Manage your admin profile, console preferences, and security.</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn-secondary" onClick={load} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && <div className="banner banner-danger">{error}</div>}
      {ok && <div className="banner banner-success">{ok}</div>}

      <div className="settings-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Admin Profile</div>
              <div className="panel-sub">Account details used across the console</div>
            </div>
            <div className="panel-sub">{loading ? ELLIPSIS : ""}</div>
          </div>

          <div className="settings-profile">
            <div className="settings-avatar">{avatar}</div>
            <div className="settings-profile-meta">
              <div className="settings-profile-name">{user?.name || "Admin"}</div>
              <div className="muted">{user?.email}</div>
            </div>
            <div className="settings-role-pill">{String(user?.role || "admin").toUpperCase()}</div>
          </div>

          <form onSubmit={saveProfile} className="settings-form">
            <div className="pred-fields">
              <label className="pred-field">
                <span>Display Name</span>
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Admin name"
                />
              </label>
              <label className="pred-field">
                <span>Email</span>
                <input className="input" value={user?.email || ""} disabled />
              </label>
            </div>

            <div className="settings-actions">
              <button type="submit" className="pred-submit" disabled={savingProfile || loading}>
                {savingProfile ? `Saving${ELLIPSIS}` : "Save Profile"}
              </button>
            </div>
          </form>

          <div className="panel-divider" />

          <div className="panel-head settings-subhead">
            <div>
              <div className="panel-title">Appearance</div>
              <div className="panel-sub">Theme and layout preferences</div>
            </div>
          </div>

          <div className="settings-row">
            <div className="settings-toggle">
              <button
                type="button"
                className={["settings-toggle-btn", theme === "dark" ? "active" : ""].join(" ")}
                onClick={() => {
                  const next = setStoredTheme("dark");
                  setTheme(next);
                  setOk("Theme updated.");
                }}
              >
                Dark
              </button>
              <button
                type="button"
                className={["settings-toggle-btn", theme === "light" ? "active" : ""].join(" ")}
                onClick={() => {
                  const next = setStoredTheme("light");
                  setTheme(next);
                  setOk("Theme updated.");
                }}
              >
                Light
              </button>
            </div>
            <div className="muted settings-hint">Theme applies instantly across the admin console.</div>
          </div>

          <div className="settings-row">
            <div className="settings-toggle">
              <button
                type="button"
                className={[
                  "settings-toggle-btn",
                  sidebarCollapsedDefault ? "active" : ""
                ].join(" ")}
                onClick={() => {
                  setAdminSidebarCollapsedStored(true);
                  setSidebarCollapsedDefault(true);
                  setOk("Sidebar preference saved.");
                }}
              >
                Sidebar: Collapsed
              </button>
              <button
                type="button"
                className={[
                  "settings-toggle-btn",
                  !sidebarCollapsedDefault ? "active" : ""
                ].join(" ")}
                onClick={() => {
                  setAdminSidebarCollapsedStored(false);
                  setSidebarCollapsedDefault(false);
                  setOk("Sidebar preference saved.");
                }}
              >
                Sidebar: Expanded
              </button>
            </div>
            <div className="muted settings-hint">
              Controls the default sidebar state on desktop.
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Dashboard Defaults</div>
              <div className="panel-sub">Controls overview range and live refresh</div>
            </div>
          </div>

          <form onSubmit={saveDashboardPrefs} className="settings-form">
            <div className="pred-fields">
              <label className="pred-field">
                <span>Days</span>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={30}
                  value={dashPrefs.days}
                  onChange={(e) =>
                    setDashPrefs((p) => ({ ...p, days: Number(e.target.value) || 1 }))
                  }
                />
              </label>
              <label className="pred-field">
                <span>Alerts Limit</span>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={50}
                  value={dashPrefs.alertLimit}
                  onChange={(e) =>
                    setDashPrefs((p) => ({ ...p, alertLimit: Number(e.target.value) || 1 }))
                  }
                />
              </label>
              <label className="pred-field">
                <span>Top At-Risk Limit</span>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={50}
                  value={dashPrefs.topLimit}
                  onChange={(e) =>
                    setDashPrefs((p) => ({ ...p, topLimit: Number(e.target.value) || 1 }))
                  }
                />
              </label>
              <label className="pred-field">
                <span>Live Interval (ms)</span>
                <input
                  className="input"
                  type="number"
                  min={1000}
                  max={15000}
                  step={500}
                  value={dashPrefs.intervalMs}
                  onChange={(e) =>
                    setDashPrefs((p) => ({ ...p, intervalMs: Number(e.target.value) || 1000 }))
                  }
                />
              </label>
            </div>

            <div className="settings-actions">
              <button type="submit" className="pred-submit" disabled={savingPrefs || loading}>
                {savingPrefs ? `Saving${ELLIPSIS}` : "Save Dashboard Defaults"}
              </button>
              <div className="muted settings-hint">
                These values apply immediately to the admin dashboard live stream.
              </div>
            </div>
          </form>

          <div className="panel-divider" />

          <div className="panel-head settings-subhead">
            <div>
              <div className="panel-title">Security</div>
              <div className="panel-sub">Change admin password</div>
            </div>
          </div>

          <form onSubmit={changePassword} className="settings-form">
            <div className="pred-fields">
              <label className="pred-field">
                <span>Current Password</span>
                <input
                  className="input"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </label>
              <label className="pred-field">
                <span>New Password</span>
                <input
                  className="input"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </label>
              <label className="pred-field">
                <span>Confirm New Password</span>
                <input
                  className="input"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </label>
            </div>

            <div className="settings-actions">
              <button type="submit" className="pred-submit" disabled={changingPwd || loading}>
                {changingPwd ? `Updating${ELLIPSIS}` : "Update Password"}
              </button>
              <div className="muted settings-hint">Password must be at least 6 characters.</div>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
