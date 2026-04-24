import { useEffect, useMemo, useState } from "react";
import { backend } from "../../services/backend";
import { useAuth } from "../../auth/AuthProvider";

const DASH = "\u2014";
const ELLIPSIS = "\u2026";

function toInputValue(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}

export default function UserSettingsPage() {
  const { user, refreshProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const [machines, setMachines] = useState([]);

  const [name, setName] = useState("");
  const [defaultMachineId, setDefaultMachineId] = useState("");
  const [autoFillSensors, setAutoFillSensors] = useState(true);
  const [sensorDefaults, setSensorDefaults] = useState({
    temperature: "",
    vibration: "",
    humidity: "",
    runtimeHours: "",
    pressure: ""
  });

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const machineOptions = useMemo(() => {
    return (machines || []).slice().sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [machines]);

  async function load() {
    setLoading(true);
    setError("");
    setOk("");
    try {
      const [me, m] = await Promise.all([backend.getMe(), backend.listMachines()]);
      const u = me?.user || me;
      setMachines(m || []);

      setName(u?.name || "");
      const prefs = u?.preferences || {};
      setDefaultMachineId(toInputValue(prefs.defaultMachineId));
      setAutoFillSensors(prefs.autoFillSensors !== undefined ? Boolean(prefs.autoFillSensors) : true);
      const sd = prefs.sensorDefaults || {};
      setSensorDefaults({
        temperature: toInputValue(sd.temperature),
        vibration: toInputValue(sd.vibration),
        humidity: toInputValue(sd.humidity),
        runtimeHours: toInputValue(sd.runtimeHours),
        pressure: toInputValue(sd.pressure)
      });
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
    setSaving(true);
    setError("");
    setOk("");

    const nextName = String(name || "").trim();
    if (!nextName) {
      setSaving(false);
      setError("Name cannot be empty.");
      return;
    }

    try {
      await backend.updateMe({
        name: nextName,
        preferences: {
          defaultMachineId: defaultMachineId || null,
          autoFillSensors,
          sensorDefaults
        }
      });
      await refreshProfile();
      setOk("Settings saved.");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
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

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-kicker">USER</div>
          <h1>Settings</h1>
          <p className="muted">Manage your profile, prediction defaults, and password.</p>
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
              <div className="panel-title">Profile</div>
              <div className="panel-sub">Basic account information</div>
            </div>
            <div className="panel-sub">{loading ? ELLIPSIS : ""}</div>
          </div>

          <form onSubmit={saveProfile} className="settings-form">
            <div className="pred-fields">
              <label className="pred-field">
                <span>Name</span>
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </label>
              <label className="pred-field">
                <span>Email</span>
                <input className="input" value={user?.email || DASH} disabled />
              </label>
            </div>

            <div className="settings-row">
              <div className="settings-toggle">
                <button
                  type="button"
                  className={["settings-toggle-btn", autoFillSensors ? "active" : ""].join(" ")}
                  onClick={() => setAutoFillSensors(true)}
                >
                  Auto-fill sensors: ON
                </button>
                <button
                  type="button"
                  className={["settings-toggle-btn", !autoFillSensors ? "active" : ""].join(" ")}
                  onClick={() => setAutoFillSensors(false)}
                >
                  Auto-fill sensors: OFF
                </button>
              </div>
              <div className="muted settings-hint">
                When enabled, the prediction form uses your saved defaults for missing fields.
              </div>
            </div>

            <div className="settings-row">
              <label className="pred-field">
                <span>Default Machine</span>
                <select
                  className="input"
                  value={defaultMachineId}
                  onChange={(e) => setDefaultMachineId(e.target.value)}
                >
                  <option value="">None</option>
                  {machineOptions.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="muted settings-hint">
                Used as the pre-selected machine when you open the prediction page.
              </div>
            </div>

            <div className="panel-divider" />

            <div className="panel-head settings-subhead">
              <div>
                <div className="panel-title">Sensor Defaults</div>
                <div className="panel-sub">Leave blank to clear that default</div>
              </div>
            </div>

            <div className="pred-fields">
              {[
                ["temperature", "Temperature"],
                ["vibration", "Vibration"],
                ["humidity", "Humidity"],
                ["runtimeHours", "Runtime Hours"],
                ["pressure", "Pressure"]
              ].map(([key, label]) => (
                <label key={key} className="pred-field">
                  <span>{label}</span>
                  <input
                    className="input"
                    type="number"
                    step="any"
                    value={sensorDefaults[key]}
                    onChange={(e) =>
                      setSensorDefaults((prev) => ({
                        ...prev,
                        [key]: e.target.value
                      }))
                    }
                    placeholder=""
                  />
                </label>
              ))}
            </div>

            <div className="settings-actions">
              <button type="submit" className="pred-submit" disabled={saving || loading}>
                {saving ? `Saving${ELLIPSIS}` : "Save Settings"}
              </button>
            </div>
          </form>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Security</div>
              <div className="panel-sub">Change password</div>
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
              <div className="muted settings-hint">
                Password must be at least 6 characters.
              </div>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
