import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LangContext";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

export default function ProfileModal({ onClose }) {
  const { user, logout } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const overlayRef = useRef(null);

  const [tab, setTab] = useState("profile");

  // Profile tab
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [username, setUsername] = useState(user?.username || "");
  const [profileMsg, setProfileMsg] = useState({ type: "", text: "" });
  const [profileBusy, setProfileBusy] = useState(false);

  // Password tab
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState({ type: "", text: "" });
  const [passwordBusy, setPasswordBusy] = useState(false);

  // Telegram tab
  const [telegramId, setTelegramId] = useState("");
  const [telegramStatus, setTelegramStatus] = useState(null);
  const [telegramMsg, setTelegramMsg] = useState({ type: "", text: "" });
  const [telegramBusy, setTelegramBusy] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    // Load telegram status
    api.get("/auth/telegram-status").then(({ data }) => {
      setTelegramStatus(data);
      if (data.telegramId) setTelegramId(data.telegramId);
    }).catch(() => {});
  }, []);

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) onClose();
  }

  async function handleProfileSave(e) {
    e.preventDefault();
    if (!username.trim()) return setProfileMsg({ type: "error", text: t.profile_username_required });
    setProfileBusy(true);
    setProfileMsg({ type: "", text: "" });
    try {
      const { data } = await api.put("/auth/profile", { fullName, username: username.trim().toLowerCase() });
      const saved = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem("user", JSON.stringify({ ...saved, ...data.user }));
      setProfileMsg({ type: "success", text: t.profile_updated + " ✓" });
      setTimeout(() => window.location.reload(), 900);
    } catch (err) {
      setProfileMsg({ type: "error", text: err.response?.data?.error || t.error_generic });
    } finally {
      setProfileBusy(false);
    }
  }

  async function handlePasswordChange(e) {
    e.preventDefault();
    if (newPassword !== confirmPassword) return setPasswordMsg({ type: "error", text: t.password_mismatch });
    if (newPassword.length < 6) return setPasswordMsg({ type: "error", text: t.password_min_length });
    setPasswordBusy(true);
    setPasswordMsg({ type: "", text: "" });
    try {
      const { data } = await api.put("/auth/change-password", { currentPassword, newPassword });
      setPasswordMsg({ type: "success", text: data.message || t.password_changed + " ✓" });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err) {
      setPasswordMsg({ type: "error", text: err.response?.data?.error || t.error_generic });
    } finally {
      setPasswordBusy(false);
    }
  }

  async function handleTelegramLink(e) {
    e.preventDefault();
    const id = telegramId.trim();
    if (!id) return setTelegramMsg({ type: "error", text: t.telegram_id_required });
    if (!/^\d+$/.test(id)) return setTelegramMsg({ type: "error", text: t.telegram_id_numeric });
    setTelegramBusy(true);
    setTelegramMsg({ type: "", text: "" });
    try {
      const { data } = await api.post("/auth/link-telegram", { telegramId: id });
      setTelegramStatus({ telegramId: id, telegramVerified: true });
      setTelegramMsg({ type: "success", text: t.telegram_linked });
    } catch (err) {
      setTelegramMsg({ type: "error", text: err.response?.data?.error || t.error_generic });
    } finally {
      setTelegramBusy(false);
    }
  }

  function handleLogout() {
    logout();
    onClose();
    navigate("/");
  }

  const isGoogle = user?.authProvider === "google";

  const tabs = [
    { id: "profile", label: t.profile_tab },
    { id: "password", label: t.password_tab },
    { id: "telegram", label: t.telegram_tab },
  ];

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(11,19,34,0.65)",
        backdropFilter: "blur(4px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div style={{
        background: "#fff",
        borderRadius: 16,
        width: "100%",
        maxWidth: 460,
        maxHeight: "90vh",
        overflowY: "auto",
        boxShadow: "0 24px 80px rgba(11,19,34,0.28)",
        animation: "slideUp 0.25s cubic-bezier(0.32,0.72,0,1)",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "1.25rem 1.5rem",
          borderBottom: "1px solid #f0ede8",
          position: "sticky", top: 0, background: "#fff", zIndex: 1,
          borderRadius: "16px 16px 0 0",
        }}>
          <span style={{ fontWeight: 700, fontSize: "1rem", color: "var(--navy,#1a1a2e)" }}>
            ⚖ Profil
          </span>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "#f5f3ef", border: "none",
              fontSize: 16, cursor: "pointer", color: "#666",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >✕</button>
        </div>

        <div style={{ padding: "1.5rem" }}>
          {/* Avatar */}
          <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "var(--navy,#1a1a2e)", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.8rem", fontWeight: 700, margin: "0 auto 0.6rem",
            }}>
              {user?.username?.[0]?.toUpperCase() || "?"}
            </div>
            <p style={{ margin: 0, fontWeight: 600, color: "var(--navy,#1a1a2e)", fontSize: "1rem" }}>
              {user?.fullName || user?.username}
            </p>
            <p style={{ margin: "0.2rem 0 0", fontSize: "0.82rem", color: "#888" }}>
              {user?.email}
            </p>
            {telegramStatus?.telegramVerified && (
              <span style={{
                display: "inline-block", marginTop: "0.4rem",
                background: "#e8f5e9", color: "#2e7d32",
                padding: "2px 10px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 600,
              }}>
                ✈️ Telegram bog'langan
              </span>
            )}
          </div>

          {/* Tabs */}
          <div style={{
            display: "flex", borderBottom: "1px solid #eee", marginBottom: "1.25rem",
          }}>
            {tabs.map((t_) => (
              <button
                key={t_.id}
                onClick={() => setTab(t_.id)}
                style={{
                  flex: 1, padding: "0.5rem 0.25rem",
                  background: "none", border: "none",
                  borderBottom: tab === t_.id ? "2px solid var(--navy,#1a1a2e)" : "2px solid transparent",
                  fontWeight: tab === t_.id ? 600 : 400,
                  color: tab === t_.id ? "var(--navy,#1a1a2e)" : "#888",
                  cursor: "pointer", fontSize: "0.82rem", marginBottom: -1,
                  transition: "all .2s", whiteSpace: "nowrap",
                }}
              >
                {t_.label}
              </button>
            ))}
          </div>

          {/* Profile tab */}
          {tab === "profile" && (
            <form onSubmit={handleProfileSave} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {profileMsg.text && <Alert type={profileMsg.type}>{profileMsg.text}</Alert>}
              <Field label={t.profile_full_name}>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder={t.profile_full_name_ph} maxLength={100} />
              </Field>
              <Field label={t.profile_username_label}>
                <Input value={username} onChange={e => setUsername(e.target.value.toLowerCase())} placeholder={t.profile_username_ph} minLength={3} maxLength={30} />
              </Field>
              <Field label={t.profile_email_label}>
                <Input value={user?.email || ""} disabled style={{ opacity: 0.6, cursor: "not-allowed" }} />
              </Field>
              <Btn type="submit" disabled={profileBusy}>{profileBusy ? t.profile_saving : t.profile_save}</Btn>
            </form>
          )}

          {/* Password tab */}
          {tab === "password" && (
            <form onSubmit={handlePasswordChange} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {passwordMsg.text && <Alert type={passwordMsg.type}>{passwordMsg.text}</Alert>}
              {isGoogle ? (
                <p style={{ color: "#888", fontSize: "0.9rem", textAlign: "center" }}>
                  {t.google_password_warning}
                </p>
              ) : (
                <>
                  <Field label={t.password_current}>
                    <Input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder={t.password_current_ph} required />
                  </Field>
                  <Field label={t.password_new}>
                    <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder={t.password_new_ph} minLength={6} required />
                  </Field>
                  <Field label={t.password_confirm}>
                    <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder={t.password_confirm_ph} required />
                  </Field>
                  <Btn type="submit" disabled={passwordBusy}>{passwordBusy ? t.password_changing : t.password_change}</Btn>
                </>
              )}
            </form>
          )}

          {/* Telegram tab */}
          {tab === "telegram" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {telegramMsg.text && <Alert type={telegramMsg.type}>{telegramMsg.text}</Alert>}

              {telegramStatus?.telegramVerified ? (
                <div style={{
                  background: "#e8f5e9", borderRadius: 10, padding: "1rem",
                  display: "flex", alignItems: "center", gap: "0.75rem",
                }}>
                  <span style={{ fontSize: "1.5rem" }}>✅</span>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, color: "#2e7d32", fontSize: "0.9rem" }}>Telegram bog'langan</p>
                    {telegramStatus.telegramUsername && (
                      <p style={{ margin: 0, fontSize: "0.8rem", color: "#555" }}>@{telegramStatus.telegramUsername}</p>
                    )}
                    <p style={{ margin: "0.25rem 0 0", fontSize: "0.78rem", color: "#888" }}>
                      Endi Telegram botdan ham foydalanishingiz mumkin ✓
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{
                    background: "#f8f9ff", borderRadius: 10, padding: "1rem",
                    fontSize: "0.85rem", color: "#444", lineHeight: 1.6,
                  }}>
                    <strong>Telegram bot bilan bog'lash:</strong>
                    <ol style={{ margin: "0.5rem 0 0", paddingLeft: "1.2rem" }}>
                      <li>Quyidagi tugmani bosing</li>
                      <li>Telegram ilovasida bot ochiladi</li>
                      <li>Botga <code style={{ background: "#eee", padding: "1px 4px", borderRadius: 3 }}>/start</code> tugmasini bosing</li>
                      <li>Hisobingiz avtomatik bog'lanadi ✅</li>
                    </ol>
                  </div>
                  <Btn
                    disabled={telegramBusy}
                    onClick={async () => {
                      setTelegramBusy(true);
                      setTelegramMsg({ type: "", text: "" });
                      try {
                        const { data } = await api.post("/auth/telegram-link-token");
                        window.open(data.botUrl, "_blank");
                        setTelegramMsg({ type: "success", text: "Telegram ochildi. Botga /start bosing. So'ng bu sahifani yangilang." });
                      } catch (err) {
                        setTelegramMsg({ type: "error", text: err.response?.data?.error || "Xatolik yuz berdi" });
                      } finally {
                        setTelegramBusy(false);
                      }
                    }}
                  >
                    {telegramBusy ? "Yuklanmoqda…" : "✈️ Telegram orqali bog'lash"}
                  </Btn>
                </>
              )}
            </div>
          )}

          {/* Logout */}
          <div style={{ marginTop: "1.5rem", textAlign: "center", paddingTop: "1rem", borderTop: "1px solid #f0ede8" }}>
            <button
              onClick={handleLogout}
              style={{
                background: "none", border: "1px solid #fca5a5",
                color: "#dc2626", padding: "0.5rem 1.5rem",
                borderRadius: 8, fontSize: "0.875rem",
                cursor: "pointer", fontWeight: 500,
              }}
            >{t.logout}</button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { transform:translateY(16px);opacity:0 } to { transform:translateY(0);opacity:1 } }
      `}</style>
    </div>
  );
}

// ── Small helpers ──
function Field({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.83rem", fontWeight: 500, color: "var(--navy,#1a1a2e)" }}>
      {label}
      {children}
    </label>
  );
}

function Input({ style, ...props }) {
  return (
    <input
      style={{
        border: "1.5px solid #e2e0db", borderRadius: 8,
        padding: "10px 12px", fontSize: "0.93rem",
        color: "var(--navy,#1a1a2e)", background: "#fff",
        outline: "none", width: "100%", boxSizing: "border-box",
        transition: "border-color 0.2s",
        ...style,
      }}
      onFocus={e => e.target.style.borderColor = "var(--navy,#1a1a2e)"}
      onBlur={e => e.target.style.borderColor = "#e2e0db"}
      {...props}
    />
  );
}

function Btn({ children, style, ...props }) {
  return (
    <button
      style={{
        background: "var(--navy,#1a1a2e)", color: "#fff",
        padding: "11px", borderRadius: 8, fontSize: "0.93rem",
        fontWeight: 500, cursor: "pointer", border: "none",
        transition: "all .2s", opacity: props.disabled ? 0.55 : 1,
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
}

function Alert({ type, children }) {
  const isSuccess = type === "success";
  return (
    <div style={{
      background: isSuccess ? "#f0fdf4" : "#fff0f0",
      color: isSuccess ? "#16a34a" : "#dc2626",
      border: `1px solid ${isSuccess ? "#bbf7d0" : "#fecaca"}`,
      borderRadius: 8, padding: "0.65rem 0.9rem",
      fontSize: "0.83rem",
    }}>
      {children}
    </div>
  );
}
