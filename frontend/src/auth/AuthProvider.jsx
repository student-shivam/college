import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refreshProfile() {
    const token = localStorage.getItem("pm_token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.get("/auth/me");
      setUser(res.data.user);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        localStorage.removeItem("pm_token");
        setUser(null);
      } else {
        // Backend is likely offline; keep token but show auth screen.
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshProfile();
  }, []);

  async function login({ email, password, role }) {
    const res = await api.post("/auth/login", { email, password, role });
    localStorage.setItem("pm_token", res.data.token);
    setUser(res.data.user);
    return res.data.user;
  }

  async function signup({ name, email, password, role }) {
    const res = await api.post("/auth/signup", { name, email, password, role });
    localStorage.setItem("pm_token", res.data.token);
    setUser(res.data.user);
    return res.data.user;
  }

  function logout() {
    localStorage.removeItem("pm_token");
    setUser(null);
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      isAdmin: user?.role === "admin",
      login,
      signup,
      logout,
      refreshProfile
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
