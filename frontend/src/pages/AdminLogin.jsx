import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import s from "./Auth.module.css";

export default function AdminLogin() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [err,  setErr]  = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const { data } = await api.post("/admin/login", form);
      localStorage.setItem("adminToken", data.token);
      localStorage.setItem("adminUser",  JSON.stringify(data.admin));
      nav("/admin");
    } catch (ex) {
      setErr(ex.response?.data?.error || "Xatolik yuz berdi");
    } finally { setBusy(false); }
  }

  return (
    <div className={s.page}>
      <div className={s.card}>
        <span className={s.logo}>🔐 Admin Panel</span>
        <h1 className={s.title}>Admin kirish</h1>
        <p className={s.sub}>Faqat adminlar uchun</p>
        {err && <div className={s.error}>{err}</div>}
        <form className={s.form} onSubmit={submit}>
          <label className={s.label}>Username
            <input className={s.input} value={form.username} onChange={e=>setForm(p=>({...p,username:e.target.value}))} required autoFocus />
          </label>
          <label className={s.label}>Parol
            <input className={s.input} type="password" value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))} required />
          </label>
          <button className={s.btn} disabled={busy}>{busy ? "Kirilmoqda..." : "Kirish"}</button>
        </form>
      </div>
    </div>
  );
}
