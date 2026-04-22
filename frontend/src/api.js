import axios from "axios";

function resolveBaseUrl() {
  const configured = import.meta.env.VITE_API_BASE_URL;
  const fallback = "http://127.0.0.1:5000/api";

  if (!configured) {
    if (typeof window !== "undefined" && window.location?.hostname) {
      return `http://${window.location.hostname}:5000/api`;
    }
    return fallback;
  }

  // If frontend is opened via LAN IP but env still points to localhost,
  // replace localhost with the current hostname so it works across devices.
  if (typeof window !== "undefined" && window.location?.hostname) {
    const host = window.location.hostname;
    if (host && host !== "localhost" && /\/\/localhost(?=[:/]|$)/.test(configured)) {
      return configured.replace(/\/\/localhost(?=[:/]|$)/, `//${host}`);
    }
  }

  return configured;
}

const api = axios.create({
  baseURL: resolveBaseUrl()
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("pm_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // When backend isn't running, browsers often show net::ERR_CONNECTION_REFUSED with no HTTP response.
    // Don't overwrite `error.message` globally; let pages decide how to present it.
    if (!error?.response) {
      error.isNetworkError = true;
    }
    return Promise.reject(error);
  }
);

export default api;
