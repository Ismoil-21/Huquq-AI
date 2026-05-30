import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LangContext";
import LangSwitcher from "../components/LangSwitcher";
import api from "../utils/api";
import s from "./Auth.module.css";

export default function Profile() {
  const { user, logout } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();

  const [tab, setTab] = useState("profile"); // "profile" | "password"

  // Profil tab
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [username, setUsername] = useState(user?.username || "");
  const [profileMsg, setProfileMsg] = useState({ type: "", text: "" });
  const [profileBusy, setProfileBusy] = useState(false);

  // Parol tab
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState({ type: "", text: "" });
  const [passwordBusy, setPasswordBusy] = useState(false);

  if (!user) {
    navigate("/login");
    return null;
  }

  async function handleProfileSave(e) {
    e.preventDefault();
    if (!username.trim()) return setProfileMsg({ type: "error", text: t.profile_username_required });
    setProfileBusy(true);
    setProfileMsg({ type: "", text: "" });
    try {
      const { data } = await api.put("/auth/profile", { fullName, username: username.trim().toLowerCase() });
      // LocalStorage yangilash
      const saved = JSON.parse(localStorage.getItem("user") || "{}");
      const updated = { ...saved, ...data.user };
      localStorage.setItem("user", JSON.stringify(updated));
      // AuthContext ni yangilash uchun page reload
      setProfileMsg({ type: "success", text: data.message || t.profile_updated });
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      setProfileMsg({ type: "error", text: err.response?.data?.error || t.error_generic });
    } finally {
      setProfileBusy(false);
    }
  }

  async function handlePasswordChange(e) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return setPasswordMsg({ type: "error", text: t.password_mismatch });
    }
    if (newPassword.length < 6) {
      return setPasswordMsg({ type: "error", text: t.password_min_length });
    }
    setPasswordBusy(true);
    setPasswordMsg({ type: "", text: "" });
    try {
      const { data } = await api.put("/auth/change-password", { currentPassword, newPassword });
      setPasswordMsg({ type: "success", text: data.message || t.password_changed });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordMsg({ type: "error", text: err.response?.data?.error || t.error_generic });
    } finally {
      setPasswordBusy(false);
    }
  }

  function handleLogout() {
    logout();
    navigate("/");
  }

  const isGoogle = user.authProvider === "google" || !user.email?.includes("@") === false;

  return (
    <div className={s.page}>
      <div className={s.card} style={{ maxWidth: 480 }}>
        <div className={s.cardTop}>
          <Link to="/" className={s.logo}><span className={s.logoIcon}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><line x1="12" y1="3" x2="12" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="4" y1="7" x2="20" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="4" y1="7" x2="1" y2="14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M1 14 Q2.5 17 4 14" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round"/><line x1="20" y1="7" x2="23" y2="14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M20 14 Q21.5 17 23 14" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round"/><line x1="9" y1="21" x2="15" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></span><span>Mening Huquqim</span></Link>
          <LangSwitcher />
        </div>

        {/* Avatar va ism */}
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "var(--navy, #1a1a2e)", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.8rem", fontWeight: 700, margin: "0 auto 0.75rem",
          }}>
            {user.username?.[0]?.toUpperCase() || "?"}
          </div>
          <p style={{ margin: 0, fontWeight: 600, color: "var(--navy, #1a1a2e)", fontSize: "1.1rem" }}>
            {user.fullName || user.username}
          </p>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "var(--gray-600, #666)" }}>
            {user.email}
          </p>
        </div>

        {/* Tablar */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", borderBottom: "1px solid var(--gray-100, #eee)" }}>
          {["profile", "password"].map((t_) => (
            <button
              key={t_}
              onClick={() => setTab(t_)}
              style={{
                padding: "0.5rem 1rem",
                background: "none",
                border: "none",
                borderBottom: tab === t_ ? "2px solid var(--navy, #1a1a2e)" : "2px solid transparent",
                fontWeight: tab === t_ ? 600 : 400,
                color: tab === t_ ? "var(--navy, #1a1a2e)" : "var(--gray-600, #888)",
                cursor: "pointer",
                fontSize: "0.9rem",
                marginBottom: "-1px",
                transition: "all .2s",
              }}
            >
              {t_ === "profile" ? t.profile_tab : t.password_tab}
            </button>
          ))}
        </div>

        {/* Profil tab */}
        {tab === "profile" && (
          <form className={s.form} onSubmit={handleProfileSave}>
            {profileMsg.text && (
              <div className={profileMsg.type === "success" ? s.success : s.error}>
                {profileMsg.text}
              </div>
            )}
            <label className={s.label}>
              {t.profile_full_name}
              <input
                className={s.input}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t.profile_full_name_ph}
                maxLength={100}
              />
            </label>
            <label className={s.label}>
              {t.profile_username_label}
              <input
                className={s.input}
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder={t.profile_username_ph}
                minLength={3}
                maxLength={30}
              />
            </label>
            <label className={s.label}>
              {t.profile_email_label}
              <input
                className={s.input}
                value={user.email || ""}
                disabled
                style={{ opacity: 0.6, cursor: "not-allowed" }}
              />
            </label>
            <button type="submit" className={s.btn} disabled={profileBusy}>
              {profileBusy ? t.profile_saving : t.profile_save}
            </button>
          </form>
        )}

        {/* Parol tab */}
        {tab === "password" && (
          <form className={s.form} onSubmit={handlePasswordChange}>
            {passwordMsg.text && (
              <div className={passwordMsg.type === "success" ? s.success : s.error}>
                {passwordMsg.text}
              </div>
            )}
            {user.authProvider === "google" ? (
              <p style={{ color: "var(--gray-600, #888)", fontSize: "0.9rem", textAlign: "center" }}>
                {t.google_password_warning}
              </p>
            ) : (
              <>
                <label className={s.label}>
                  {t.password_current}
                  <input
                    type="password"
                    className={s.input}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder={t.password_current_ph}
                    required
                  />
                </label>
                <label className={s.label}>
                  {t.password_new}
                  <input
                    type="password"
                    className={s.input}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t.password_new_ph}
                    minLength={6}
                    required
                  />
                </label>
                <label className={s.label}>
                  {t.password_confirm}
                  <input
                    type="password"
                    className={s.input}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t.password_confirm_ph}
                    required
                  />
                </label>
                <button type="submit" className={s.btn} disabled={passwordBusy}>
                  {passwordBusy ? t.password_changing : t.password_change}
                </button>
              </>
            )}
          </form>
        )}

        {/* Chiqish tugmasi */}
        <div style={{ marginTop: "2rem", textAlign: "center" }}>
          <button
            onClick={handleLogout}
            style={{
              background: "none",
              border: "1px solid #fca5a5",
              color: "#dc2626",
              padding: "0.5rem 1.5rem",
              borderRadius: "8px",
              fontSize: "0.875rem",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            {t.logout}
          </button>
        </div>
      </div>
    </div>
  );
}