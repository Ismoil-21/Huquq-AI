import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../utils/api";

const Ctx = createContext(null);

export function AdminProvider({ children }) {
  const [admin,   setAdmin]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    const saved = localStorage.getItem("adminUser");
    if (token && saved) {
      try { setAdmin(JSON.parse(saved)); } catch { /* ignore */ }
    }
    setLoading(false);
  }, []);

  async function login(username, password) {
    const { data } = await api.post("/admin/login", { username, password });
    localStorage.setItem("adminToken", data.token);
    localStorage.setItem("adminUser",  JSON.stringify(data.admin));
    setAdmin(data.admin);
    return data.admin;
  }

  function logout() {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    setAdmin(null);
  }

  return (
    <Ctx.Provider value={{ admin, loading, login, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAdmin = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAdmin must be inside AdminProvider");
  return ctx;
};
