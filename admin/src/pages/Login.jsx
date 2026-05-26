import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdmin } from "../context/AdminContext";
import s from "./Login.module.css";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [err,  setErr]  = useState("");
  const [busy, setBusy] = useState(false);
  const { login } = useAdmin();
  const nav = useNavigate();

  async function submit(e) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setErr(""); setBusy(true);
    try {
      await login(username.trim(), password);
      nav("/");
    } catch (ex) {
      setErr(ex.response?.data?.error || "Username yoki parol noto'g'ri");
    } finally { setBusy(false); }
  }

  return (
    <div className={s.page}>
      <div className={s.card}>
        <div className={s.logo}>
          <span className={s.logoIcon}>⚖️</span>
          <div>
            <span className={s.logoText}>Mening Huquqim</span>
            <span className={s.logoSub}>Boshqaruv paneli</span>
          </div>
        </div>

        <div className={s.lockIcon}>🔐</div>
        <h1 className={s.title}>Kirish</h1>
        <p className={s.sub}>Faqat vakolatli adminlar uchun</p>

        {err && <div className={s.error}><span>⚠️</span> {err}</div>}

        <form className={s.form} onSubmit={submit} noValidate>
          <div className={s.field}>
            <label className={s.label}>Username</label>
            <input
              className={s.input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              autoComplete="username"
              required autoFocus
            />
          </div>
          <div className={s.field}>
            <label className={s.label}>Parol</label>
            <div style={{ position: "relative" }}>
              <input
                className={s.input}
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                style={{ paddingRight: "2.75rem" }}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                style={{
                  position: "absolute", right: 12, top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text3)", fontSize: 15,
                  transition: "color .2s",
                }}
              >{showPass ? "🙈" : "👁"}</button>
            </div>
          </div>
          <button className={s.btn} disabled={busy || !username.trim() || !password}>
            {busy ? <><span className={s.spinner} /> Kirilmoqda...</> : "Kirish →"}
          </button>
        </form>

        <p className={s.note}>
          Asosiy sayt: <a href="https://huquq-ai-seven.vercel.app/" target="_blank" rel="noreferrer">mening-huquqim.uz</a>
        </p>
      </div>
    </div>
  );
}
