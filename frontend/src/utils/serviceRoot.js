import api from "../api";

export function getServiceRoot() {
  const base = String(api.defaults.baseURL || "");
  return base.replace(/\/api\/?$/, "");
}

export function toServiceUrl(path) {
  if (!path) return "";
  const value = String(path);
  if (/^https?:\/\//i.test(value)) return value;
  const root = getServiceRoot();
  if (!root) return value;
  return `${root}${value.startsWith("/") ? value : `/${value}`}`;
}

