const DASH_KEY = "pm_admin_dashboard_prefs";
const THEME_KEY = "pm_theme";
const COLLAPSE_KEY = "pm_admin_sidebar_collapsed";

function clampInt(value, min, max, fallback) {
  const n = Number.parseInt(String(value), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch (_err) {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (_err) {
    return false;
  }
}

export function loadAdminDashboardPrefs() {
  const stored = readJson(DASH_KEY, {});
  return {
    days: clampInt(stored.days, 1, 30, 7),
    alertLimit: clampInt(stored.alertLimit, 1, 50, 6),
    topLimit: clampInt(stored.topLimit, 1, 50, 6),
    intervalMs: clampInt(stored.intervalMs, 1000, 15000, 2500)
  };
}

export function saveAdminDashboardPrefs(next) {
  const prev = loadAdminDashboardPrefs();
  const merged = {
    ...prev,
    ...(next || {})
  };
  const normalized = {
    days: clampInt(merged.days, 1, 30, 7),
    alertLimit: clampInt(merged.alertLimit, 1, 50, 6),
    topLimit: clampInt(merged.topLimit, 1, 50, 6),
    intervalMs: clampInt(merged.intervalMs, 1000, 15000, 2500)
  };
  writeJson(DASH_KEY, normalized);
  return normalized;
}

export function getStoredTheme() {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === "light" ? "light" : "dark";
  } catch (_err) {
    return "dark";
  }
}

export function setStoredTheme(theme) {
  const next = theme === "light" ? "light" : "dark";
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch (_err) {
    // ignore
  }
  window.dispatchEvent(new Event("pm_theme_change"));
  return next;
}

export function isAdminSidebarCollapsedStored() {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch (_err) {
    return false;
  }
}

export function setAdminSidebarCollapsedStored(collapsed) {
  try {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
  } catch (_err) {
    // ignore
  }
  window.dispatchEvent(new Event("pm_admin_sidebar_change"));
  return Boolean(collapsed);
}

export const adminPrefEvents = {
  dashboardChanged: "pm_admin_settings_change",
  themeChanged: "pm_theme_change",
  sidebarChanged: "pm_admin_sidebar_change"
};

