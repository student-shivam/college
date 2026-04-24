import api from "../api";
import axios from "axios";

function isHttpError(err, code) {
  return Number(err?.response?.status) === Number(code);
}

function dateKey(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function emptyTrend(days) {
  const safeDays = Math.min(Math.max(Number(days) || 7, 1), 30);
  const now = new Date();
  const out = [];
  for (let i = safeDays - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    out.push({ date: dateKey(d), Healthy: 0, Warning: 0, Critical: 0 });
  }
  return out;
}

function mapOldRiskCountsToStatusCounts(riskCounts) {
  const rc = riskCounts || {};
  const low = Number(rc.Low) || 0;
  const med = Number(rc.Medium) || 0;
  const high = Number(rc.High) || 0;
  const crit = Number(rc.Critical) || 0;
  return {
    Healthy: low,
    Warning: med,
    Critical: high + crit,
    Unknown: 0
  };
}

function toOverviewFromOldUserSnapshot(old, { days = 7 } = {}) {
  const dist = mapOldRiskCountsToStatusCounts(old?.riskCounts);
  const trackedMachines = old?.totalMachines ?? 0;
  return {
    scope: "user",
    now: new Date().toISOString(),
    cards: {
      trackedMachines,
      Healthy: dist.Healthy || 0,
      Warning: dist.Warning || 0,
      Critical: dist.Critical || 0
    },
    distribution: dist,
    trend: emptyTrend(days),
    recentAlerts: [],
    topAtRisk: []
  };
}

function toOverviewFromOldAdminSnapshot(old, { days = 7 } = {}) {
  const dash = old?.dashboard || {};
  const dist = mapOldRiskCountsToStatusCounts(dash?.riskCounts);
  const totalMachines = dash?.totalMachines ?? 0;
  return {
    scope: "admin",
    now: new Date().toISOString(),
    cards: {
      totalMachines,
      Healthy: dist.Healthy || 0,
      Warning: dist.Warning || 0,
      Critical: dist.Critical || 0
    },
    distribution: dist,
    trend: emptyTrend(days),
    recentAlerts: [],
    topAtRisk: []
  };
}

function openDashboardStreamImpl({
  path,
  days = 7,
  alertLimit = 6,
  topLimit = 6,
  intervalMs = 2500,
  onSnapshot,
  onError
}) {
  const token = localStorage.getItem("pm_token") || "";
  const base = api.defaults.baseURL || "";
  const params = new URLSearchParams();
  params.set("token", token);
  params.set("days", String(days));
  params.set("alertLimit", String(alertLimit));
  params.set("topLimit", String(topLimit));
  params.set("intervalMs", String(intervalMs));

  const url = `${base}${path}?${params.toString()}`;
  const es = new EventSource(url);

  es.addEventListener("snapshot", (evt) => {
    try {
      const data = JSON.parse(evt.data);
      onSnapshot?.(data);
    } catch (err) {
      onError?.(err);
    }
  });

  es.addEventListener("error", (evt) => {
    onError?.(evt);
  });

  return es;
}

function resolveServiceRoot() {
  const base = String(api.defaults.baseURL || "");
  return base.replace(/\/api\/?$/, "");
}

export const backend = {
  pingBackend: async () => {
    const root = resolveServiceRoot();
    return (await axios.get(`${root}/health`, { timeout: 1500 })).data;
  },

  // Dashboards (new overview + live stream)
  getAdminDashboardOverview: async ({ days = 7, alertLimit = 6, topLimit = 6 } = {}) => {
    const params = new URLSearchParams();
    params.set("days", String(days));
    params.set("alertLimit", String(alertLimit));
    params.set("topLimit", String(topLimit));
    try {
      return (await api.get(`/dashboard/admin/overview?${params.toString()}`)).data;
    } catch (err) {
      // Backward compat: older backend only has GET /dashboard (admin snapshot).
      if (isHttpError(err, 404)) {
        const old = await backend.getAdminSnapshot();
        return toOverviewFromOldAdminSnapshot(old, { days });
      }
      throw err;
    }
  },

  getUserDashboardOverview: async ({ days = 7, alertLimit = 6, topLimit = 6 } = {}) => {
    const params = new URLSearchParams();
    params.set("days", String(days));
    params.set("alertLimit", String(alertLimit));
    params.set("topLimit", String(topLimit));
    try {
      return (await api.get(`/dashboard/me/overview?${params.toString()}`)).data;
    } catch (err) {
      // Backward compat: older backend only has GET /dashboard/me (user snapshot).
      if (isHttpError(err, 404)) {
        const old = await backend.getUserSnapshot();
        return toOverviewFromOldUserSnapshot(old, { days });
      }
      throw err;
    }
  },

  openAdminDashboardStream: (opts) =>
    openDashboardStreamImpl({ ...(opts || {}), path: "/dashboard/admin/stream" }),

  openUserDashboardStream: (opts) =>
    openDashboardStreamImpl({ ...(opts || {}), path: "/dashboard/me/stream" }),

  // Admin dashboard
  getAdminSnapshot: async () => {
    const [dashboardRes, usersRes] = await Promise.all([
      api.get("/dashboard"),
      api.get("/users")
    ]);
    return { dashboard: dashboardRes.data, users: usersRes.data };
  },

  // User dashboard
  getUserSnapshot: async () => (await api.get("/dashboard/me")).data,

  // Users
  listUsers: async () => (await api.get("/users")).data,
  createUser: async (payload) => (await api.post("/users", payload)).data,
  updateUser: async (id, payload) => (await api.patch(`/users/${id}`, payload)).data,
  deleteUser: async (id) => (await api.delete(`/users/${id}`)).data,
  getMe: async () => (await api.get("/users/me")).data,
  updateMe: async (payload) => (await api.patch("/users/me", payload)).data,
  changeMyPassword: async (payload) => (await api.post("/users/me/password", payload)).data,

  // Machines
  listMachines: async () => (await api.get("/machines")).data,
  createMachine: async (payload) => (await api.post("/machines", payload)).data,

  // Sensor data (Admin)
  uploadSensorData: async (file) => {
    const form = new FormData();
    form.append("file", file);
    const res = await api.post("/data/upload", form, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return res.data;
  },
  listSensorData: async ({ page = 1, limit = 20, machineId = "" } = {}) => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (machineId) params.set("machineId", machineId);
    return (await api.get(`/data?${params.toString()}`)).data;
  },
  deleteSensorData: async (id) => (await api.delete(`/data/${id}`)).data,

  // Predictions (backend integrates ML API)
  createPrediction: async (payload) => (await api.post("/predictions", payload)).data,
  listPredictions: async (limit = 100) => (await api.get(`/predictions?limit=${limit}`)).data,

  // Model management (Admin)
  getModelStatus: async () => (await api.get("/model/status")).data,
  trainModel: async () => (await api.post("/model/train")).data,
  updateModel: async () => (await api.post("/model/update")).data,

  // Alerts (Admin)
  listAlertRules: async () => (await api.get("/alerts/rules")).data,
  createAlertRule: async (payload) => (await api.post("/alerts/rules", payload)).data,
  updateAlertRule: async (id, payload) => (await api.patch(`/alerts/rules/${id}`, payload)).data,
  deleteAlertRule: async (id) => (await api.delete(`/alerts/rules/${id}`)).data,
  listAlertEvents: async (limit = 50) => (await api.get(`/alerts/events?limit=${limit}`)).data
};
