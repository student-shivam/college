import api from "../api";

export const backend = {
  // Admin dashboard
  getAdminSnapshot: async () => {
    const [dashboardRes, usersRes] = await Promise.all([
      api.get("/dashboard"),
      api.get("/users")
    ]);
    return { dashboard: dashboardRes.data, users: usersRes.data };
  },

  // Users
  listUsers: async () => (await api.get("/users")).data,
  createUser: async (payload) => (await api.post("/users", payload)).data,
  updateUser: async (id, payload) => (await api.patch(`/users/${id}`, payload)).data,
  deleteUser: async (id) => (await api.delete(`/users/${id}`)).data,

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
