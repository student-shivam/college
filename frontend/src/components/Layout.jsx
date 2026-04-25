import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { adminPrefEvents } from "../utils/adminPrefs";

const THEME_KEY = "pm_theme";
const COLLAPSE_KEY = "pm_admin_sidebar_collapsed";

function readStored(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v;
  } catch (_err) {
    return fallback;
  }
}

function isMobileWidth() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(max-width: 860px)")?.matches ?? false;
}

export default function Layout() {
  const location = useLocation();
  const [theme, setTheme] = useState(() => {
    const stored = readStored(THEME_KEY, "dark");
    return stored === "light" ? "light" : "dark";
  });
  const [collapsed, setCollapsed] = useState(() => readStored(COLLAPSE_KEY, "0") === "1");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (_err) {
      // ignore
    }
    document.body.classList.remove("theme-dark", "theme-light");
    document.body.classList.add(theme === "light" ? "theme-light" : "theme-dark");
  }, [theme]);

  useEffect(() => {
    function syncThemeFromStorage() {
      const stored = readStored(THEME_KEY, "dark");
      setTheme(stored === "light" ? "light" : "dark");
    }

    function syncSidebarFromStorage() {
      setCollapsed(readStored(COLLAPSE_KEY, "0") === "1");
    }

    function onStorage(e) {
      if (!e) return;
      if (e.key === THEME_KEY) syncThemeFromStorage();
      if (e.key === COLLAPSE_KEY) syncSidebarFromStorage();
    }

    window.addEventListener(adminPrefEvents.themeChanged, syncThemeFromStorage);
    window.addEventListener(adminPrefEvents.sidebarChanged, syncSidebarFromStorage);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(adminPrefEvents.themeChanged, syncThemeFromStorage);
      window.removeEventListener(adminPrefEvents.sidebarChanged, syncSidebarFromStorage);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
    } catch (_err) {
      // ignore
    }
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function onResize() {
      if (!isMobileWidth()) setMobileOpen(false);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function toggleDesktopCollapse() {
    if (isMobileWidth()) {
      setMobileOpen(false);
      return;
    }
    setCollapsed((v) => !v);
  }

  function toggleMobileMenu() {
    if (!isMobileWidth()) return;
    setMobileOpen((v) => !v);
  }

  return (
    <div className={["saas-shell", collapsed ? "sidebar-collapsed" : ""].join(" ")}>
      <Navbar
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        onToggleSidebar={toggleMobileMenu}
        profilePath="/admin/profile"
      />

      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onToggle={toggleDesktopCollapse}
      />

      <main className="saas-main saas-main-with-fixed-nav">
        <div className="saas-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
