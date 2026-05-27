import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LangContext";
import LangSwitcher from "../components/LangSwitcher";
import axios from "axios";
import s from "./Auth.module.css";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

/* ───────── Google SVG Icon ───────── */
function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

/* ───────── Google Button ───────── */
function GoogleButton({ labelKey, onCredential, disabled }) {
  const btnRef = useRef(null);
  const [gReady, setGReady] = useState(false);
  const { t } = useLang();

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    function initGoogle() {
      if (!window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (res) => onCredential(res.credential),
        auto_select: false,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: false,
      });
      setGReady(true);
    }

    const existing = document.getElementById("google-gsi-script");
    if (existing && window.google?.accounts?.id) {
      initGoogle();
      return;
    }
    const script = document.createElement("script");
    script.id = "google-gsi-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initGoogle;
    document.head.appendChild(script);
  }, [onCredential]);

  const handleClick = useCallback(() => {
    if (!gReady || !window.google?.accounts?.id) return;
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // fallback: renderButton click qilish
        btnRef.current?.querySelector("[data-google-btn]")?.click();
      }
    });
  }, [gReady]);

  const label = t[labelKey] || t.google_btn;

  if (!GOOGLE_CLIENT_ID) {
    return (
      <button
        type="button"
        className={s.googleBtn}
        disabled
        style={{ opacity: 0.5, cursor: "not-allowed" }}
      >
        <GoogleIcon />
        <span>{t.google_btn_disabled}</span>
      </button>
    );
  }

  return (
    <button
      ref={btnRef}
      type="button"
      className={s.googleBtn}
      onClick={handleClick}
      disabled={disabled || !gReady}
    >
      <GoogleIcon />
      <span>{gReady ? label : "..."}</span>
    </button>
  );
}

/* ───────── OTP tasdiqlash ekrani ───────── */
function OTPVerify({ email, onSuccess, onBack }) {
  const [otp, setOtp] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [resent, setResent] = useState(false);
  const [timer, setTimer] = useState(60);
  const { verifyOtp, resendOtp } = useAuth();
  const { t } = useLang();

  useEffect(() => {
    if (timer <= 0) return;
    const id = setTimeout(() => setTimer((prev) => prev - 1), 1000);
    return () => clearTimeout(id);
  }, [timer]);

  async function handleVerify(e) {
    e.preventDefault();
    if (otp.length !== 6) return setErr(t.otp_length_error);
    setErr("");
    setBusy(true);
    try {
      await verifyOtp(email, otp);
      onSuccess?.();
    } catch (ex) {
      setErr(ex.response?.data?.error || t.otp_error);
    } finally {
      setBusy(false);
    }
  }

  async function handleResend() {
    setBusy(true);
    setErr("");
    try {
      await resendOtp(email);
      setResent(true);
      setTimer(60);
    } catch (ex) {
      setErr(ex.response?.data?.error || t.otp_send_error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={s.page}>
      <div className={s.card}>
        <div className={s.cardTop}>
          <Link to="/" className={s.logo}>
            ⚖ Mening Huquqim
          </Link>
          <LangSwitcher />
        </div>
        <div className={s.otpIcon}>📧</div>
        <h1 className={s.title}>{t.otp_title}</h1>
        <p className={s.sub}>
          <strong>{email}</strong> {t.otp_sent}
        </p>
        {err && <div className={s.error}>{err}</div>}
        {resent && <div className={s.success}>{t.otp_resent}</div>}
        <div className={s.form}>
          <input
            className={`${s.input} ${s.otpInput}`}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={otp}
            onChange={(e) =>
              setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="_ _ _ _ _ _"
            autoFocus
          />
          <button
            className={s.btn}
            onClick={handleVerify}
            disabled={busy || otp.length < 6}
          >
            {busy ? t.otp_verifying : t.otp_verify}
          </button>
        </div>
        <div className={s.otpFooter}>
          {timer > 0 ? (
            <span className={s.timerText}>
              {t.otp_timer}: {timer}s
            </span>
          ) : (
            <button
              className={s.linkBtn}
              onClick={handleResend}
              disabled={busy}
            >
              {t.otp_resend}
            </button>
          )}
        </div>
        <button
          className={s.linkBtn}
          onClick={onBack}
          style={{ marginTop: "0.5rem" }}
        >
          {t.otp_back}
        </button>
      </div>
    </div>
  );
}

/* ───────── Support Modal ───────── */
function SupportModal({ onClose }) {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [err, setErr] = useState("");
  const { t } = useLang();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.message.trim()) return;
    if (!form.name.trim()) {
      setErr(t.support_name_required);
      return;
    }
    if (!form.email.trim()) {
      setErr(t.support_email_required);
      return;
    }
    setErr("");
    setBusy(true);
    try {
      await axios.post("/api/support", form);
      setSuccess(true);
      setTimeout(() => onClose(), 2000);
    } catch (ex) {
      const errorMsg = ex.response?.data?.error;
      if (
        errorMsg?.includes("email") ||
        errorMsg?.includes("Email") ||
        errorMsg?.includes("пользователь") ||
        errorMsg?.includes("user")
      ) {
        setErr(t.support_email_not_found);
      } else {
        setErr(errorMsg || t.support_error);
      }
    } finally {
      setBusy(false);
    }
  }

  if (success) {
    return (
      <div className={s.modalOverlay} onClick={onClose}>
        <div className={s.modal} onClick={(e) => e.stopPropagation()}>
          <div className={s.modalSuccess}>✅ {t.support_success}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={s.modalOverlay} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <h2>{t.support_title}</h2>
          <button className={s.modalClose} onClick={onClose}>
            ×
          </button>
        </div>
        <p className={s.modalDesc}>{t.support_desc}</p>
        {err && <div className={s.error}>{err}</div>}
        <form className={s.modalForm} onSubmit={handleSubmit}>
          <label className={s.label}>
            {t.support_name}
            <input
              className={s.input}
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder={t.support_name}
              required
            />
          </label>
          <label className={s.label}>
            {t.support_email}
            <input
              className={s.input}
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((p) => ({ ...p, email: e.target.value }))
              }
              placeholder={t.support_email}
              required
            />
          </label>
          <label className={s.label}>
            {t.support_message}
            <textarea
              className={s.textarea}
              value={form.message}
              onChange={(e) =>
                setForm((p) => ({ ...p, message: e.target.value }))
              }
              placeholder={t.support_message}
              required
              rows={4}
            />
          </label>
          <button className={s.btn} type="submit" disabled={busy}>
            {busy ? t.support_sending : t.support_send}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ───────── Login sahifasi ───────── */
export function Login() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [needsVerify, setNeedsVerify] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState("");
  const [showSupport, setShowSupport] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const { t } = useLang();
  const nav = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await login(form.username.trim(), form.password);
      nav("/chat");
    } catch (ex) {
      const data = ex.response?.data;
      if (data?.needsVerification) {
        setVerifyEmail(data.email || form.username);
        setNeedsVerify(true);
      } else {
        setErr(data?.error || t.error_generic);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle(credential) {
    setErr("");
    setBusy(true);
    try {
      await loginWithGoogle(credential);
      nav("/chat");
    } catch (ex) {
      setErr(ex.response?.data?.error || t.google_error);
    } finally {
      setBusy(false);
    }
  }

  if (needsVerify) {
    return (
      <OTPVerify
        email={verifyEmail}
        onSuccess={() => nav("/chat")}
        onBack={() => setNeedsVerify(false)}
      />
    );
  }

  return (
    <div className={s.page}>
      <div className={s.card}>
        <div className={s.cardTop}>
          <Link to="/" className={s.logo}>
            ⚖ {t.nav_logo}
          </Link>
          <LangSwitcher />
        </div>
        <h1 className={s.title}>{t.login_title}</h1>
        <p className={s.sub}>{t.login_sub}</p>
        {err && <div className={s.error}>{err}</div>}

        <GoogleButton
          labelKey="google_btn"
          onCredential={handleGoogle}
          disabled={busy}
        />

        <div className={s.divider}>
          <span>{t.divider_or}</span>
        </div>

        <div className={s.form}>
          <label className={s.label}>
            {t.login_username}
            <input
              className={s.input}
              value={form.username}
              onChange={(e) =>
                setForm((p) => ({ ...p, username: e.target.value }))
              }
              placeholder={t.login_username_ph}
              required
              autoFocus
            />
          </label>
          <label className={s.label}>
            {t.login_password}
            <input
              className={s.input}
              type="password"
              value={form.password}
              onChange={(e) =>
                setForm((p) => ({ ...p, password: e.target.value }))
              }
              placeholder={t.login_password_ph}
              required
            />
          </label>
          <button className={s.btn} onClick={submit} disabled={busy}>
            {busy ? t.login_loading : t.login_btn}
          </button>
        </div>
        <p className={s.foot}>
          {t.login_no_account}{" "}
          <Link to="/register" className={s.link}>
            {t.login_register_link}
          </Link>
        </p>
        <button
          className={s.linkBtn}
          onClick={() => setShowSupport(true)}
          style={{ marginTop: "0.5rem" }}
        >
          {t.tech_support}
        </button>
        {showSupport && <SupportModal onClose={() => setShowSupport(false)} />}
      </div>
    </div>
  );
}

/* ───────── Register sahifasi ───────── */
export function Register() {
  const [form, setForm] = useState({
    username: "",
    password: "",
    fullName: "",
    email: "",
  });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [needsVerify, setNeedsVerify] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState("");
  const { register, loginWithGoogle } = useAuth();
  const { t } = useLang();
  const nav = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const result = await register(
        form.username.trim(),
        form.password,
        form.fullName.trim(),
        form.email.trim(),
      );
      if (result?.needsVerification) {
        setVerifyEmail(result.email || form.email);
        setNeedsVerify(true);
      } else {
        nav("/chat");
      }
    } catch (ex) {
      setErr(ex.response?.data?.error || t.error_generic);
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle(credential) {
    setErr("");
    setBusy(true);
    try {
      await loginWithGoogle(credential);
      nav("/chat");
    } catch (ex) {
      setErr(ex.response?.data?.error || t.google_error);
    } finally {
      setBusy(false);
    }
  }

  if (needsVerify) {
    return (
      <OTPVerify
        email={verifyEmail}
        onSuccess={() => nav("/chat")}
        onBack={() => setNeedsVerify(false)}
      />
    );
  }

  return (
    <div className={s.page}>
      <div className={s.card}>
        <div className={s.cardTop}>
          <Link to="/" className={s.logo}>
            ⚖ {t.nav_logo}
          </Link>
          <LangSwitcher />
        </div>
        <h1 className={s.title}>{t.register_title}</h1>
        <p className={s.sub}>{t.register_sub}</p>
        {err && <div className={s.error}>{err}</div>}

        <GoogleButton
          labelKey="google_btn_register"
          onCredential={handleGoogle}
          disabled={busy}
        />

        <div className={s.divider}>
          <span>{t.divider_or_email}</span>
        </div>

        <div className={s.form}>
          <label className={s.label}>
            {t.register_fullname}
            <input
              className={s.input}
              value={form.fullName}
              onChange={(e) =>
                setForm((p) => ({ ...p, fullName: e.target.value }))
              }
              placeholder={t.register_fullname_ph}
            />
          </label>
          <label className={s.label}>
            Username
            <input
              className={s.input}
              value={form.username}
              onChange={(e) =>
                setForm((p) => ({ ...p, username: e.target.value }))
              }
              placeholder={t.register_username_ph}
              required
              autoFocus
            />
          </label>
          <label className={s.label}>
            Email
            <input
              className={s.input}
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((p) => ({ ...p, email: e.target.value }))
              }
              placeholder={t.register_email_ph}
              required
            />
          </label>
          <label className={s.label}>
            {t.login_password}
            <input
              className={s.input}
              type="password"
              value={form.password}
              onChange={(e) =>
                setForm((p) => ({ ...p, password: e.target.value }))
              }
              placeholder={t.register_password_ph}
              required
              minLength={6}
            />
          </label>
          <button className={s.btn} onClick={submit} disabled={busy}>
            {busy ? t.register_loading : t.register_btn}
          </button>
        </div>
        <p className={s.foot}>
          {t.register_have_account}{" "}
          <Link to="/login" className={s.link}>
            {t.register_login_link}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
