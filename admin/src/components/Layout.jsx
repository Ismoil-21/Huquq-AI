import React, { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAdmin } from "../context/AdminContext";
import axios from "axios";
import s from "./Layout.module.css";

const NAV = [
  { to: "/",             icon: "◈",  label: "Dashboard"            },
  { to: "/chats",        icon: "◉",  label: "Suhbatlar"            },
  { to: "/users",        icon: "⬡",  label: "Foydalanuvchilar"     },
  { to: "/visitors",     icon: "◎",  label: "Tashrif buyuruvchilar"},
  { to: "/logins",       icon: "⬢",  label: "Kirish tarixi"        },
  { to: "/support",      icon: "✉",  label: "Texnik yordam"       },
  { to: "/settings",     icon: "◬",  label: "Sozlamalar"           },
];

function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className={s.topTime}>
      {time.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
    </span>
  );
}

export default function Layout() {
  const { admin, logout } = useAdmin();
  const nav = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const api = axios.create({ baseURL: "/api" });
  api.interceptors.request.use((cfg) => {
    const token = localStorage.getItem("adminToken");
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
    return cfg;
  });

  useEffect(() => {
    loadPendingCount();
    const interval = setInterval(loadPendingCount, 30000); // Har 30 sekundda yangilash
    return () => clearInterval(interval);
  }, []);

  async function loadPendingCount() {
    try {
      const { data } = await api.get("/support");
      const messages = Array.isArray(data) ? data : [];
      const unread = messages.filter(m => m.status === "pending" && !m.read).length;
      setPendingCount(unread);
    } catch (err) {
      console.error("Pending count error:", err);
      setPendingCount(0);
    }
  }

  function handleLogout() { logout(); nav("/login"); }

  return (
    <div className={`${s.shell} ${collapsed ? s.collapsed : ""}`}>
      {/* ── Sidebar ── */}
      <aside className={s.sidebar}>
        <div className={s.brand}>
          <div className={s.brandGlow} />
          <span className={s.brandIcon}>⚖️</span>
          {!collapsed && (
            <div>
              <span className={s.brandText}>Admin Panel</span>
              <span className={s.brandSub}>Mening Huquqim</span>
            </div>
          )}
        </div>

        <nav className={s.nav}>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) => `${s.link} ${isActive ? s.active : ""}`}
              title={collapsed ? item.label : undefined}
            >
              <span className={s.linkIcon}>{item.icon}</span>
              {!collapsed && <span className={s.linkLabel}>{item.label}</span>}
              {item.to === "/support" && pendingCount > 0 && (
                <span className={s.badge}>{pendingCount}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className={s.sideBottom}>
          <button className={s.collapseBtn} onClick={() => setCollapsed((p) => !p)} title="Kichraytirish">
            {collapsed ? "▶" : "◀"}
          </button>
          <div className={s.userRow}>
            <div className={s.userAvatar}>{admin?.username?.[0]?.toUpperCase()}</div>
            {!collapsed && (
              <div className={s.userInfo}>
                <span className={s.userName}>{admin?.username}</span>
                <span className={s.userRole}>Administrator</span>
                <button className={s.logoutBtn} onClick={handleLogout}>Chiqish →</button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className={s.main}>
        <header className={s.topbar}>
          <div className={s.topLeft}>
            <span className={s.topTitle}>Mening Huquqim</span>
            <span className={s.topBadge}>LIVE</span>
          </div>
          <div className={s.topRight}>
            <Clock />
            <span className={s.topAdmin}>👤 {admin?.username}</span>
            <button className={s.topLogout} onClick={handleLogout}>Chiqish →</button>
          </div>
        </header>
        <main className={s.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
