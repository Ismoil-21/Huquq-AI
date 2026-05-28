import React, { useState } from "react";
import api from "../utils/api";
import { PageHeader, Card, Btn } from "../components/Shared";
import { useAdmin } from "../context/AdminContext";
import s from "./Settings.module.css";

export default function Settings() {
  const { admin } = useAdmin();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [msg,  setMsg]  = useState({ text: "", type: "" });
  const [busy, setBusy] = useState(false);

  function set(k, v) { setForm((p) => ({ ...p, [k]: v })); setMsg({ text:"", type:"" }); }

  async function changePassword(e) {
    e.preventDefault();
    if (form.newPassword.length < 6) {
      setMsg({ text: "Yangi parol kamida 6 ta belgi bo'lsin", type:"err" }); return;
    }
    if (form.newPassword !== form.confirm) {
      setMsg({ text: "Parollar mos kelmadi", type:"err" }); return;
    }
    setBusy(true);
    try {
      await api.post("/admin/change-password", {
        currentPassword: form.currentPassword,
        newPassword:     form.newPassword,
      });
      setMsg({ text: "Parol muvaffaqiyatli o'zgartirildi ✅", type:"ok" });
      setForm({ currentPassword:"", newPassword:"", confirm:"" });
    } catch (ex) {
      setMsg({ text: ex.response?.data?.error || "Xatolik yuz berdi", type:"err" });
    } finally { setBusy(false); }
  }

  return (
    <div>
      <PageHeader title="⚙️ Sozlamalar" />

      <div style={{ maxWidth: 480, display:"flex", flexDirection:"column", gap:"1.25rem" }}>

        {/* Admin info */}
        <Card title="Admin ma'lumotlari">
          <div className={s.infoRow}>
            <span className={s.infoLabel}>Username</span>
            <span className={s.infoVal}>@{admin?.username}</span>
          </div>
          <div className={s.infoRow}>
            <span className={s.infoLabel}>Rol</span>
            <span className={s.infoVal}>Admin</span>
          </div>
        </Card>

        {/* Change password */}
        <Card title="Parolni o'zgartirish">
          {msg.text && (
            <div className={msg.type === "ok" ? s.msgOk : s.msgErr}>{msg.text}</div>
          )}
          <form className={s.form} onSubmit={changePassword}>
            <label className={s.label}>Joriy parol
              <input className={s.input} type="password" value={form.currentPassword} onChange={(e)=>set("currentPassword",e.target.value)} required placeholder="••••••" />
            </label>
            <label className={s.label}>Yangi parol
              <input className={s.input} type="password" value={form.newPassword} onChange={(e)=>set("newPassword",e.target.value)} required placeholder="Kamida 6 belgi" minLength={6} />
            </label>
            <label className={s.label}>Yangi parolni tasdiqlash
              <input className={s.input} type="password" value={form.confirm} onChange={(e)=>set("confirm",e.target.value)} required placeholder="••••••" />
            </label>
            <Btn variant="primary" disabled={busy}>{busy ? "Saqlanmoqda..." : "Parolni saqlash"}</Btn>
          </form>
        </Card>

        {/* Site links */}
        <Card title="Murojaatlar">
          <div className={s.links}>
            <a href="https://huquq-ai-rose.vercel.app/" target="_blank" rel="noreferrer" className={s.link}>🌐 Asosiy sayt →</a>
            <a href="https://huquq-ai-fpa2.onrender.com/health" target="_blank" rel="noreferrer" className={s.link}>❤️ API holati →</a>
          </div>
        </Card>
      </div>
    </div>
  );
}
