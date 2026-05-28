import React, { useState, useEffect, useCallback } from "react";
import { Users as UsersIcon, RefreshCw, Key, Trash2, Lock, X, Eye, EyeOff, AlertTriangle, Check, BarChart3 } from "lucide-react";
import api from "../utils/api";
import { PageHeader, SearchBar, Badge, Btn, Loader, EmptyState, Pagination } from "../components/Shared";
import s from "./Table.module.css";
import ms from "./Modal.module.css";

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("uz-UZ", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/* ── Modal wrapper ── */
function Modal({ onClose, children, wide = false }) {
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className={ms.overlay} onClick={onClose}>
      <div className={`${ms.modal} ${wide ? ms.wide : ""}`} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

/* ── Modal header ── */
function ModalHeader({ icon, title, subtitle, onClose }) {
  return (
    <div className={ms.header}>
      <div className={ms.headerLeft}>
        <div className={ms.headerIcon}>{typeof icon === 'string' ? icon : <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}</div>
        <div>
          <div className={ms.headerTitle}>{title}</div>
          {subtitle && <div className={ms.headerSub}>{subtitle}</div>}
        </div>
      </div>
      <button className={ms.closeBtn} onClick={onClose}><X size={16} /></button>
    </div>
  );
}

/* ── Input field ── */
function Field({ label, children }) {
  return (
    <div className={ms.field}>
      <label className={ms.fieldLabel}>{label}</label>
      {children}
    </div>
  );
}

/* ── Reset Password Modal ── */
function ResetPasswordModal({ user, onClose }) {
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy]       = useState(false);
  const [err, setErr]         = useState("");
  const [ok, setOk]           = useState("");
  const [show, setShow]       = useState(false);

  function generate() {
    const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789@#!";
    let p = "";
    for (let i = 0; i < 12; i++) p += chars[Math.floor(Math.random() * chars.length)];
    setNewPass(p); setConfirm(p); setErr(""); setOk("");
  }

  async function save() {
    setErr(""); setOk("");
    if (!newPass || newPass.length < 6) return setErr("Kamida 6 ta belgi kiriting");
    if (newPass !== confirm) return setErr("Parollar mos kelmaydi");
    setBusy(true);
    try {
      const { data } = await api.patch(`/admin/users/${user._id}/reset-password`, { newPassword: newPass });
      let emailMsg = "";
      if (data.emailSent) {
        emailMsg = ` ✉️ ${data.emailAddress} ga xabar yuborildi`;
      } else if (user.email) {
        emailMsg = ` (email yuborishda xato${data.emailError ? ": " + data.emailError : ""})`;
      } else {
        emailMsg = " (email yo'q)";
      }
      setOk((data.message || "Parol muvaffaqiyatli yangilandi") + emailMsg);
      setNewPass(""); setConfirm("");
    } catch (e) {
      setErr(e.response?.data?.error || "Xatolik yuz berdi");
    } finally { setBusy(false); }
  }

  return (
    <Modal onClose={onClose}>
      <ModalHeader icon={<Key size={20} />} title="Parolni reset qilish" subtitle={`@${user.username}`} onClose={onClose} />

      <div className={ms.body}>
        <div className={ms.userCard}>
          <div className={ms.userCardAvatar}>{user.username[0].toUpperCase()}</div>
          <div>
            <div className={ms.userCardName}>{user.fullName || user.username}</div>
            <div className={ms.userCardEmail}>{user.email || "Email yo'q"}</div>
          </div>
        </div>

        <Field label="Yangi parol">
          <div style={{ position: "relative" }}>
            <input
              className={ms.input}
              type={show ? "text" : "password"}
              value={newPass}
              onChange={(e) => { setNewPass(e.target.value); setErr(""); setOk(""); }}
              placeholder="Yangi parolni kiriting..."
              style={{ paddingRight: "2.5rem", fontFamily: "var(--font-mono)" }}
            />
            <button type="button" className={ms.eyeBtn} onClick={() => setShow(v => !v)}>
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Field>

        <Field label="Parolni tasdiqlash">
          <input
            className={ms.input}
            type={show ? "text" : "password"}
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); setErr(""); setOk(""); }}
            placeholder="Qayta kiriting..."
            style={{ fontFamily: "var(--font-mono)" }}
          />
        </Field>

        <button type="button" className={ms.generateBtn} onClick={generate}>
          <RefreshCw size={14} /> Avtomatik parol yaratish
        </button>

        {err && <div className={ms.alertErr}><AlertTriangle size={14} /> {err}</div>}
        {ok  && <div className={ms.alertOk}><Check size={14} /> {ok}</div>}
      </div>

      <div className={ms.footer}>
        <button className={ms.btnCancel} onClick={onClose}>Bekor qilish</button>
        <button className={ms.btnPrimary} onClick={save} disabled={busy}>
          {busy ? <><span className={ms.spinner} /> Saqlanmoqda...</> : "💾 Saqlash"}
        </button>
      </div>
    </Modal>
  );
}

/* ── Limit Modal ── */
function LimitModal({ user, onClose, onSave }) {
  const [val, setVal] = useState(user.dailyLimit ?? 20);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const presets = [5, 10, 20, 50, 100, 500];

  async function save() {
    setBusy(true); setErr("");
    try {
      await api.patch(`/admin/users/${user._id}/limit`, { dailyLimit: val });
      onSave(val); onClose();
    } catch (e) {
      setErr(e.response?.data?.error || "Xatolik");
    } finally { setBusy(false); }
  }

  return (
    <Modal onClose={onClose}>
      <ModalHeader icon={<BarChart3 size={20} />} title="Kunlik limit" subtitle={`@${user.username}`} onClose={onClose} />

      <div className={ms.body}>
        <Field label="Kunlik AI savol limiti">
          <input
            className={ms.input}
            type="number" min={1} max={10000} value={val}
            onChange={(e) => setVal(Number(e.target.value))}
            style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 600 }}
          />
        </Field>

        <div className={ms.presets}>
          {presets.map(p => (
            <button
              key={p}
              className={`${ms.presetBtn} ${val === p ? ms.presetActive : ""}`}
              onClick={() => setVal(p)}
            >{p}</button>
          ))}
        </div>

        <div className={ms.limitInfo}>
          <span className={ms.limitInfoItem}>
            <span className={ms.limitDot} style={{ background: "var(--accent)" }} />
            Hozirgi: <strong>{user.dailyLimit ?? 20}</strong>
          </span>
          <span className={ms.limitInfoItem}>
            <span className={ms.limitDot} style={{ background: "var(--green)" }} />
            Yangi: <strong>{val}</strong>
          </span>
        </div>

        {err && <div className={ms.alertErr}><AlertTriangle size={14} /> {err}</div>}
      </div>

      <div className={ms.footer}>
        <button className={ms.btnCancel} onClick={onClose}>Bekor qilish</button>
        <button className={ms.btnPrimary} onClick={save} disabled={busy}>
          {busy ? <><span className={ms.spinner} /> Saqlanmoqda...</> : "Saqlash"}
        </button>
      </div>
    </Modal>
  );
}

/* ── Asosiy komponent ── */
export default function Users() {
  const [users, setUsers]         = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [pages, setPages]         = useState(1);
  const [search, setSearch]       = useState("");
  const [loading, setLoading]     = useState(false);
  const [busy, setBusy]           = useState(null);
  const [resetUser, setResetUser] = useState(null);
  const [limitUser, setLimitUser] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, limit: 25 });
      if (search) p.set("search", search);
      const { data } = await api.get(`/admin/users?${p}`);
      setUsers(data.users); setTotal(data.total); setPages(data.pages);
    } catch { }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  async function remove(id, username) {
    if (!window.confirm(`"${username}" foydalanuvchisini o'chirishni tasdiqlaysizmi?\nBarcha suhbatlari ham o'chadi!`)) return;
    setBusy(id);
    try { await api.delete(`/admin/users/${id}`); load(); }
    finally { setBusy(null); }
  }

  return (
    <div>
      {resetUser && <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} />}
      {limitUser && (
        <LimitModal
          user={limitUser}
          onClose={() => setLimitUser(null)}
          onSave={(val) => setUsers(prev => prev.map(u => u._id === limitUser._id ? { ...u, dailyLimit: val } : u))}
        />
      )}

      <PageHeader title={<><UsersIcon size={20} /> Foydalanuvchilar ({total})</>}>
        <Btn variant="ghost" onClick={load}><RefreshCw size={16} /> Yangilash</Btn>
      </PageHeader>

      <div className={s.filters}>
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Username, email yoki ism..." />
      </div>

      {loading && <Loader />}
      {!loading && users.length === 0 && <EmptyState icon={<UsersIcon size={32} />} text="Foydalanuvchi topilmadi" />}

      {!loading && users.length > 0 && (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Username</th>
                <th>Ism</th>
                <th>Email</th>
                <th>Suhbatlar</th>
                <th>Limit/kun</th>
                <th>Ro'yxat</th>
                <th>Holat</th>
                <th>Amal</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} className={u.isBlocked ? s.blockedRow : ""}>
                  <td>
                    <span className={s.username}>@{u.username}</span>
                    <span className={s.fullname}>
                      {u.authProvider === "google" && <span style={{ color: "#4285f4", marginRight: 4 }}>🔵</span>}
                      {u.telegramVerified && <span style={{ color: "#06b6d4", marginRight: 4 }}>✈️</span>}
                      {u.lastLoginSource === "mobile" && <span style={{ color: "#10b981", marginRight: 4 }}>📱</span>}
                    </span>
                  </td>
                  <td>{u.fullName || <span className={s.anon}>—</span>}</td>
                  <td>
                    <span style={{ fontSize: "12px", color: "var(--text2)", fontFamily: "var(--font-mono)" }}>
                      {u.email || <span className={s.anon}>—</span>}
                    </span>
                    {u.emailVerified
                      ? <span title="Email tasdiqlangan" style={{ marginLeft: 5, color: "var(--green)", fontSize: 11 }}>✓</span>
                      : <span title="Tasdiqlanmagan"      style={{ marginLeft: 5, color: "var(--red)",   fontSize: 11 }}>✗</span>
                    }
                  </td>
                  <td className={s.center}><span className={s.count}>{u.chatCount || 0}</span></td>
                  <td className={s.center}>
                    <button
                      onClick={() => setLimitUser(u)}
                      title="Limitni o'zgartirish"
                      style={{
                        background: "var(--bg4)", border: "1px solid var(--border2)",
                        borderRadius: 6, padding: "3px 10px", cursor: "pointer",
                        fontSize: "12px", color: "var(--accent2)", fontWeight: 600,
                        transition: "all .18s", fontFamily: "var(--font-mono)",
                      }}
                      onMouseEnter={e => { e.target.style.borderColor = "rgba(59,130,246,.4)"; }}
                      onMouseLeave={e => { e.target.style.borderColor = "var(--border2)"; }}
                    >
                      {u.dailyLimit ?? 20}/kun
                    </button>
                  </td>
                  <td className={s.nowrap} style={{ fontSize: 12, color: "var(--text3)", fontFamily: "var(--font-mono)" }}>
                    {fmtDate(u.createdAt)}
                  </td>
                  <td>
                    <Badge type={u.isBlocked ? "blocked" : "active"}>
                      {u.isBlocked ? "Bloklangan" : "Faol"}
                    </Badge>
                  </td>
                  <td>
                    <div className={s.actions}>
                      <Btn small variant="ghost" disabled={busy === u._id} onClick={() => setResetUser(u)} title="Parolni reset qilish">
                        <Key size={14} /> Reset
                      </Btn>
                      <Btn small variant="danger" disabled={busy === u._id} onClick={() => remove(u._id, u.username)}>
                        <Trash2 size={14} />
                      </Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} pages={pages} onChange={setPage} />
    </div>
  );
}
