import { useEffect, useMemo, useState } from "react";
import api from "../api";
import { backend } from "../services/backend";
import { toast } from "../utils/toastBus";
import { toUiErrorMessage } from "../utils/toUiErrorMessage";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [backendOnline, setBackendOnline] = useState(true);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [usersApiMissing, setUsersApiMissing] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "user",
    password: ""
  });

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm({ name: "", email: "", role: "user", password: "" });
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const name = String(u.name || "").toLowerCase();
      const email = String(u.email || "").toLowerCase();
      const role = String(u.role || "").toLowerCase();
      return name.includes(q) || email.includes(q) || role.includes(q);
    });
  }, [users, query]);

  function sortUsers(list) {
    return (list || []).slice().sort((a, b) => {
      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();
      return bTime - aTime;
    });
  }

  async function loadUsers() {
    setLoading(true);
    try {
      try {
        await backend.pingBackend();
        setBackendOnline(true);
      } catch (_err) {
        setBackendOnline(false);
        setUsers([]);
        setUsersApiMissing(false);
        toast.error("Service is currently unavailable. Please try again.", {
          dedupeKey: "admin-users-backend-offline"
        });
        return;
      }

      const res = await api.get("/users");
      setUsers(sortUsers(res.data || []));
      setUsersApiMissing(false);
    } catch (err) {
      if (err.response?.status === 404) {
        setUsersApiMissing(true);
        toast.info("Users API is unavailable; some actions may be limited.", {
          dedupeKey: "users-api-missing",
          suppressMs: 12000
        });
      } else {
        toast.error(toUiErrorMessage(err));
        setUsersApiMissing(false);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function submit(e) {
    e.preventDefault();
    try {
      if (!backendOnline) {
        toast.error("Service is currently unavailable. Please try again.");
        return;
      }

      if (!form.name.trim() || !form.email.trim()) {
        toast.error("Name and email are required.");
        return;
      }

      if (!editing && String(form.password).length < 6) {
        toast.error("Password must be at least 6 characters.");
        return;
      }

      if (editing) {
        const payload = {
          name: form.name,
          email: form.email,
          role: form.role
        };
        if (form.password) payload.password = form.password;

        const res = await api.patch(`/users/${editing._id}`, payload);
        setUsers((prev) => prev.map((u) => (u._id === editing._id ? res.data : u)));
        toast.success("User updated.");
      } else {
        try {
          const res = await api.post("/users", form);
          setUsers((prev) => sortUsers([res.data, ...prev]));
          toast.success("User created.");
          setUsersApiMissing(false);
        } catch (err) {
          if (err.response?.status !== 404) {
            throw err;
          }

          // Fallback for an older backend instance without /api/users.
          // Create via signup and ignore returned token.
          const signupRes = await api.post("/auth/signup", form);
          const created = signupRes.data?.user;
          if (created) {
            const now = new Date().toISOString();
            setUsers((prev) =>
              sortUsers([
                {
                  ...created,
                  createdAt: created.createdAt || now,
                  updatedAt: created.updatedAt || now
                },
                ...prev
              ])
            );
            toast.success("User created.");
          }
          setUsersApiMissing(true);
        }
      }

      closeModal();
    } catch (err) {
      if (err?.isNetworkError || !err?.response) setBackendOnline(false);
      toast.error(toUiErrorMessage(err));
    }
  }

  async function remove(user) {
    if (!window.confirm(`Delete user "${user.name}"?`)) return;
    try {
      await api.delete(`/users/${user._id}`);
      setUsers((prev) => prev.filter((u) => u._id !== user._id));
      toast.success("User deleted.");
      if (editing?._id === user._id) {
        closeModal();
      }
    } catch (err) {
      if (err?.isNetworkError || !err?.response) setBackendOnline(false);
      toast.error(toUiErrorMessage(err));
    }
  }

  function startEdit(user) {
    setEditing(user);
    setForm({
      name: user.name || "",
      email: user.email || "",
      role: user.role || "user",
      password: ""
    });
    setModalOpen(true);
  }

  return (
    <section className="admin-user-page">
      <article className="admin-card">
        <div className="admin-user-toolbar">
          <div className="admin-user-title">
            <h2>User Management</h2>
            <div className="admin-muted">
              Total users: <strong>{users.length}</strong>
            </div>
          </div>

          <div className="admin-user-controls">
            <input
              className="admin-user-search"
              placeholder="Search name / email / role"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className={`status-indicator ${backendOnline ? "is-ok" : "is-bad"}`}>
              <span className="status-dot" aria-hidden="true" />
              <span className="status-text">Backend {backendOnline ? "Online" : "Offline"}</span>
            </div>
            <div className="admin-user-buttons">
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setForm({ name: "", email: "", role: "user", password: "" });
                  setModalOpen(true);
                }}
                disabled={!backendOnline}
              >
                Add User
              </button>
              <button type="button" className="admin-secondary" onClick={loadUsers} disabled={loading}>
                {loading ? "Loading..." : "Refresh"}
              </button>
            </div>
          </div>
        </div>

        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Created</th>
                <th style={{ width: 220 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u._id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`role-pill role-${u.role}`}>{u.role}</span>
                  </td>
                  <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "-"}</td>
                  <td>
                    <div className="admin-row-actions">
                      <button type="button" onClick={() => startEdit(u)} disabled={usersApiMissing}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => remove(u)}
                        disabled={usersApiMissing}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="admin-muted">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>

      {modalOpen && (
        <div
          className="admin-modal"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="admin-modal-panel">
            <div className="admin-modal-head">
              <div>
                <div className="admin-card-kicker">{editing ? "EDIT USER" : "CREATE USER"}</div>
                <h2>{editing ? "Update User" : "Add New User"}</h2>
              </div>
              <button type="button" className="admin-modal-close" onClick={closeModal} title="Close">
                X
              </button>
            </div>

            <form onSubmit={submit} className="form-block">
              <label>
                <span>Full Name</span>
                <input
                  placeholder="e.g. Rahul Yadav"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                />
              </label>
              <label>
                <span>Email</span>
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                />
              </label>
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
              <label>
                <span>{editing ? "Password (optional)" : "Password"}</span>
                <input
                  type="password"
                  placeholder={editing ? "Leave blank to keep same" : "Min 6 characters"}
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                />
              </label>

              <div className="admin-actions-row">
                <button type="submit" disabled={Boolean(editing) && usersApiMissing}>
                  {editing ? "Save Changes" : "Create User"}
                </button>
                <button type="button" className="admin-secondary" onClick={closeModal}>
                  Cancel
                </button>
              </div>
            </form>

            <div className="admin-user-hint">
              <div className="admin-muted">
                Note: You can't delete your own admin account (safety).
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
