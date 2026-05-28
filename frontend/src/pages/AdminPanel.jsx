import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, Routes, Route, Link, useLocation } from "react-router-dom";
import { Briefcase, Users, Home, ShoppingCart, Gavel, FileText, User, Mail, Calendar, Globe, Smartphone, MessageSquare, BarChart3 } from "lucide-react";
import axios from "axios";
import s from "./AdminPanel.module.css";

// Separate axios instance for admin (uses adminToken)
const adminApi = axios.create({ baseURL: "/api", timeout: 20000 });
adminApi.interceptors.request.use((cfg) => {
  const t = localStorage.getItem("adminToken");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});
adminApi.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminUser");
      window.location.href = "/admin/login";
    }
    return Promise.reject(err);
  }
);

// ── Guard ──────────────────────────────────────────────────────────────────────
function AdminGuard({ children }) {
  const nav = useNavigate();
  const token = localStorage.getItem("adminToken");
  useEffect(() => { if (!token) nav("/admin/login"); }, [token, nav]);
  if (!token) return null;
  return children;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const CAT_LABELS = {
  mehnat:<><Briefcase size={14} /> Mehnat</>, 
  oila:<><Users size={14} /> Oila</>, 
  meros:<><Home size={14} /> Meros</>,
  yer:<><FileText size={14} /> Yer</>, 
  istemolchi:<><ShoppingCart size={14} /> Iste'molchi</>, 
  jinoiy:<><Gavel size={14} /> Jinoyat</>, 
  boshqa:<><FileText size={14} /> Boshqa</>,
};
function fmtDate(d) { return d ? new Date(d).toLocaleDateString("uz-UZ") : "—"; }
function fmtNum(n)  { return Number(n || 0).toLocaleString(); }

// ── OVERVIEW ──────────────────────────────────────────────────────────────────
function Overview() {
  const [data, setData] = useState(null);
  const [err,  setErr]  = useState("");

  useEffect(() => {
    adminApi.get("/admin/stats")
      .then(({ data }) => setData(data))
      .catch(() => setErr("Ma'lumot yuklanmadi"));
  }, []);

  if (err)   return <div className={s.errMsg}>{err}</div>;
  if (!data) return <div className={s.loading}>Yuklanmoqda...</div>;

  const { overview, weekStats, categories } = data;

  const catEntries = Object.entries(categories)
    .filter(([k]) => k !== "_id")
    .sort((a, b) => b[1] - a[1]);

  const maxWeek = Math.max(...weekStats.map((w) => w.total), 1);

  return (
    <div className={s.section}>
      <h2 className={s.sTitle}><BarChart3 size={20} /> Dashboard</h2>

      {/* Stat cards */}
      <div className={s.cards}>
        {[
          { label:"Jami suhbatlar",    val: fmtNum(overview.totalChats),     icon:<MessageSquare size={20} /> },
          { label:"Jami foydalanuvchilar", val: fmtNum(overview.totalUsers), icon:<User size={20} /> },
          { label:"Jami xabarlar",     val: fmtNum(overview.totalMessages),  icon:<Mail size={20} /> },
          { label:"Bugun",             val: fmtNum(overview.todayQuestions), icon:<Calendar size={20} /> },
          { label:"Web (bugun)",       val: fmtNum(overview.todayWeb),       icon:<Globe size={20} /> },
          { label:"Telegram (bugun)",  val: fmtNum(overview.todayTelegram),  icon:<Smartphone size={20} /> },
        ].map((c) => (
          <div key={c.label} className={s.statCard}>
            <span className={s.statIcon}>{c.icon}</span>
            <div className={s.statVal}>{c.val}</div>
            <div className={s.statLabel}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Bar chart — last 14 days */}
      <div className={s.chartBox}>
        <h3 className={s.chartTitle}>So'nggi 14 kun</h3>
        <div className={s.bars}>
          {weekStats.map((d) => (
            <div key={d.date} className={s.barCol}>
              <div className={s.barWrap}>
                <div className={s.bar} style={{ height: `${(d.total / maxWeek) * 100}%` }} title={d.total} />
              </div>
              <span className={s.barLabel}>{d.date.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className={s.chartBox}>
        <h3 className={s.chartTitle}>Kategoriyalar bo'yicha</h3>
        <div className={s.catList}>
          {catEntries.map(([k, v]) => {
            const total = catEntries.reduce((s, [, n]) => s + n, 0) || 1;
            return (
              <div key={k} className={s.catRow}>
                <span className={s.catName}>{CAT_LABELS[k] || k}</span>
                <div className={s.catBarWrap}>
                  <div className={s.catBar} style={{ width: `${(v / total) * 100}%` }} />
                </div>
                <span className={s.catVal}>{fmtNum(v)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── CHATS LIST ────────────────────────────────────────────────────────────────
function ChatsList() {
  const [chats, setChats]     = useState([]);
  const [total, setTotal]     = useState(0);
  const [page,  setPage]      = useState(1);
  const [pages, setPages]     = useState(1);
  const [search, setSearch]   = useState("");
  const [source, setSource]   = useState("");
  const [catFilter, setCat]   = useState("");
  const [loading, setLoading] = useState(false);
  const [detail, setDetail]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.set("search", search);
      if (source) params.set("source", source);
      if (catFilter) params.set("category", catFilter);
      const { data } = await adminApi.get(`/admin/chats?${params}`);
      setChats(data.chats); setTotal(data.total); setPages(data.pages);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [page, search, source, catFilter]);

  useEffect(() => { load(); }, [load]);

  async function deleteChat(sessionId) {
    if (!confirm("Suhbatni o'chirish?")) return;
    await adminApi.delete(`/admin/chats/${sessionId}`);
    load();
  }

  async function viewDetail(sessionId) {
    const { data } = await adminApi.get(`/admin/chats/${sessionId}`);
    setDetail(data);
  }

  return (
    <div className={s.section}>
      <h2 className={s.sTitle}>💬 Suhbatlar ({fmtNum(total)})</h2>

      <div className={s.filters}>
        <input className={s.filterInput} placeholder="Qidirish..." value={search} onChange={e=>{ setSearch(e.target.value); setPage(1); }} />
        <select className={s.filterSel} value={source} onChange={e=>{ setSource(e.target.value); setPage(1); }}>
          <option value="">Hammasi</option>
          <option value="web">Web</option>
          <option value="telegram">Telegram</option>
        </select>
        <select className={s.filterSel} value={catFilter} onChange={e=>{ setCat(e.target.value); setPage(1); }}>
          <option value="">Kategoriya</option>
          {Object.entries(CAT_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
        </select>
        <button className={s.filterBtn} onClick={load}>🔄</button>
      </div>

      {loading && <div className={s.loading}>Yuklanmoqda...</div>}

      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead><tr><th>Foydalanuvchi</th><th>Manba</th><th>Kategoriya</th><th>Xabar</th><th>Birinchi savol</th><th>Sana</th><th>Amal</th></tr></thead>
          <tbody>
            {chats.map((c) => (
              <tr key={c.sessionId}>
                <td>{c.user?.username || c.telegramUsername || "—"}</td>
                <td><span className={c.source === "web" ? s.badgeWeb : s.badgeTg}>{c.source}</span></td>
                <td><span className={s.badgeCat}>{CAT_LABELS[c.category] || c.category}</span></td>
                <td>{c.messageCount}</td>
                <td className={s.truncate}>{c.firstQuestion}</td>
                <td>{fmtDate(c.createdAt)}</td>
                <td className={s.actions}>
                  <button className={s.viewBtn} onClick={() => viewDetail(c.sessionId)}>👁</button>
                  <button className={s.delBtn}  onClick={() => deleteChat(c.sessionId)}>🗑</button>
                </td>
              </tr>
            ))}
            {!loading && chats.length === 0 && <tr><td colSpan={7} className={s.empty}>Suhbat topilmadi</td></tr>}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className={s.pagination}>
          <button disabled={page <= 1} onClick={() => setPage(p=>p-1)}>← Oldingi</button>
          <span>{page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage(p=>p+1)}>Keyingi →</button>
        </div>
      )}

      {/* Detail modal */}
      {detail && (
        <div className={s.modalOverlay} onClick={() => setDetail(null)}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <div className={s.modalHead}>
              <h3>Suhbat tafsiloti</h3>
              <button className={s.modalClose} onClick={() => setDetail(null)}>✕</button>
            </div>
            <div className={s.modalMeta}>
              <span>🗂 {CAT_LABELS[detail.category] || detail.category}</span>
              <span>📅 {fmtDate(detail.createdAt)}</span>
              {detail.userId && <span>👤 {detail.userId.username}</span>}
            </div>
            <div className={s.modalMessages}>
              {detail.messages.map((m, i) => (
                <div key={i} className={`${s.dmsg} ${s[m.role]}`}>
                  <span className={s.dmsgRole}>{m.role === "user" ? "👤 Foydalanuvchi" : "⚖️ AI"}</span>
                  <p className={s.dmsgText}>{m.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── USERS LIST ────────────────────────────────────────────────────────────────
function UsersList() {
  const [users,   setUsers]   = useState([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [pages,   setPages]   = useState(1);
  const [search,  setSearch]  = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.set("search", search);
      const { data } = await adminApi.get(`/admin/users?${params}`);
      setUsers(data.users); setTotal(data.total); setPages(data.pages);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  async function toggleBlock(id) {
    await adminApi.patch(`/admin/users/${id}/block`);
    load();
  }
  async function deleteUser(id) {
    if (!confirm("Foydalanuvchini o'chirish? Barcha suhbatlar ham o'chadi.")) return;
    await adminApi.delete(`/admin/users/${id}`);
    load();
  }

  return (
    <div className={s.section}>
      <h2 className={s.sTitle}>👥 Foydalanuvchilar ({fmtNum(total)})</h2>
      <div className={s.filters}>
        <input className={s.filterInput} placeholder="Username bo'yicha qidirish..." value={search} onChange={e=>{ setSearch(e.target.value); setPage(1); }} />
        <button className={s.filterBtn} onClick={load}>🔄</button>
      </div>
      {loading && <div className={s.loading}>Yuklanmoqda...</div>}
      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead><tr><th>Username</th><th>Ism</th><th>Suhbatlar</th><th>Ro'yxat sanasi</th><th>So'nggi kirish</th><th>Holat</th><th>Amal</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id} className={u.isBlocked ? s.blockedRow : ""}>
                <td><strong>{u.username}</strong></td>
                <td>{u.fullName || "—"}</td>
                <td>{u.chatCount || 0}</td>
                <td>{fmtDate(u.createdAt)}</td>
                <td>{fmtDate(u.lastLogin)}</td>
                <td><span className={u.isBlocked ? s.badgeBlock : s.badgeActive}>{u.isBlocked ? "Bloklangan" : "Faol"}</span></td>
                <td className={s.actions}>
                  <button className={u.isBlocked ? s.unblockBtn : s.blockBtn} onClick={() => toggleBlock(u._id)}>{u.isBlocked ? "Ochish" : "Bloklash"}</button>
                  <button className={s.delBtn} onClick={() => deleteUser(u._id)}>🗑</button>
                </td>
              </tr>
            ))}
            {!loading && users.length === 0 && <tr><td colSpan={7} className={s.empty}>Foydalanuvchi topilmadi</td></tr>}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className={s.pagination}>
          <button disabled={page <= 1} onClick={() => setPage(p=>p-1)}>← Oldingi</button>
          <span>{page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage(p=>p+1)}>Keyingi →</button>
        </div>
      )}
    </div>
  );
}

// ── MAIN ADMIN PANEL ─────────────────────────────────────────────────────────

// ── SETTINGS ──────────────────────────────────────────────────────────────────
function Settings() {
  const [cur,  setCur]  = useState("");
  const [np,   setNp]   = useState("");
  const [conf, setConf] = useState("");
  const [msg,  setMsg]  = useState({ type: "", text: "" });
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!cur || !np || !conf) return setMsg({ type: "error", text: "Barcha maydonlarni to'ldiring" });
    if (np.length < 6)        return setMsg({ type: "error", text: "Yangi parol kamida 6 ta belgi bo'lsin" });
    if (np !== conf)          return setMsg({ type: "error", text: "Yangi parollar mos kelmadi" });
    setBusy(true);
    setMsg({ type: "", text: "" });
    try {
      await adminApi.post("/admin/change-password", { currentPassword: cur, newPassword: np });
      setMsg({ type: "success", text: "✅ Parol muvaffaqiyatli o'zgartirildi" });
      setCur(""); setNp(""); setConf("");
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.error || "Server xatosi" });
    } finally {
      setBusy(false);
    }
  }

  const inp = {
    display: "block", width: "100%", padding: "10px 14px",
    border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14,
    outline: "none", boxSizing: "border-box", marginTop: 6,
    fontFamily: "inherit", color: "#1e293b",
  };
  const lbl = { display: "block", fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 12 };

  return (
    <div className={s.section}>
      <h2 className={s.sectionTitle}>⚙️ Sozlamalar</h2>
      <div style={{ maxWidth: 420, background: "#fff", borderRadius: 12, padding: "1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}>
        <h3 style={{ margin: "0 0 1.25rem", fontSize: 16, color: "#1e293b" }}>🔐 Parolni o'zgartirish</h3>
        {msg.text && (
          <div style={{
            padding: "10px 14px", borderRadius: 8, marginBottom: "1rem", fontSize: 13,
            background: msg.type === "success" ? "#f0fdf4" : "#fff1f2",
            color:      msg.type === "success" ? "#15803d" : "#be123c",
            border:     `1px solid ${msg.type === "success" ? "#bbf7d0" : "#fecdd3"}`,
          }}>{msg.text}</div>
        )}
        <form onSubmit={handleSubmit}>
          <label style={lbl}>
            Joriy parol
            <input style={inp} type="password" value={cur} onChange={e => setCur(e.target.value)} placeholder="••••••" required />
          </label>
          <label style={lbl}>
            Yangi parol
            <input style={inp} type="password" value={np}  onChange={e => setNp(e.target.value)}  placeholder="Kamida 6 belgi" required minLength={6} />
          </label>
          <label style={lbl}>
            Yangi parolni tasdiqlang
            <input style={inp} type="password" value={conf} onChange={e => setConf(e.target.value)} placeholder="••••••" required />
          </label>
          <button
            type="submit"
            disabled={busy}
            style={{
              width: "100%", padding: "11px", borderRadius: 8, border: "none",
              background: busy ? "#94a3b8" : "#1e293b", color: "#fff",
              fontSize: 14, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer",
              marginTop: 4, transition: "background .2s",
            }}
          >
            {busy ? "Saqlanmoqda..." : "Parolni saqlash"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const nav  = useNavigate();
  const loc  = useLocation();
  const admin = JSON.parse(localStorage.getItem("adminUser") || "{}");

  function logout() {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    nav("/admin/login");
  }

  const links = [
    { to: "/admin",        label: "📊 Dashboard" },
    { to: "/admin/chats",  label: "💬 Suhbatlar" },
    { to: "/admin/users",    label: "👥 Foydalanuvchilar" },
    { to: "/admin/settings", label: "⚙️ Sozlamalar" },
  ];

  return (
    <AdminGuard>
      <div className={s.layout}>
        {/* Sidebar */}
        <aside className={s.side}>
          <div className={s.sideBrand}>🔐 Admin Panel</div>
          <nav className={s.sideNav}>
            {links.map((l) => (
              <Link key={l.to} to={l.to} className={`${s.sideLink} ${loc.pathname === l.to ? s.sideLinkActive : ""}`}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div className={s.sideBottom}>
            <div className={s.sideUser}>👤 {admin.username}</div>
            <button className={s.sideLogout} onClick={logout}>Chiqish</button>
          </div>
        </aside>

        {/* Content */}
        <div className={s.content}>
          <Routes>
            <Route index        element={<Overview />} />
            <Route path="chats" element={<ChatsList />} />
            <Route path="users"    element={<UsersList />} />
            <Route path="settings" element={<Settings />} />
          </Routes>
        </div>
      </div>
    </AdminGuard>
  );
}