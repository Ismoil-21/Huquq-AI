import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LangContext";
import { useChatPanel } from "../context/ChatPanelContext";
import { MessageSquare, RefreshCw, X, Send, History, Trash2, Paperclip } from "lucide-react";
import favicon from "../../public/favicon.png";
import LangSwitcher from "./LangSwitcher";
import api from "../utils/api";
import {
  loadHistory,
  upsertSession,
  getStoredSession,
  getActiveSessionId,
  setActiveSessionId,
  deleteStoredSession,
  clearGuestData,
} from "../utils/chatStorage";
import s from "./ChatDrawer.module.css";

const TELEGRAM_URL = "https://t.me/mening_huquqlarim_bot";

function newUserSessionId(userId) {
  return `web_${userId}_${Date.now()}`;
}

function formatDate(ts, lang) {
  const locale = lang === "ru" ? "ru-RU" : lang === "en" ? "en-US" : "uz-UZ";
  return new Date(ts).toLocaleDateString(locale, {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

/* ─── Limit indikatori ─── */
function UsageBadge({ usage }) {
  if (!usage) return null;
  const { used, limit } = usage;
  const pct   = Math.min(100, Math.round((used / limit) * 100));
  const color = pct >= 100 ? "#dc2626" : pct >= 80 ? "#f59e0b" : "#16a34a";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      fontSize: "0.75rem", color, fontWeight: 600,
      padding: "2px 8px", borderRadius: 20,
      background: color + "18", border: `1px solid ${color}40`,
    }}>
      {used}/{limit}
    </div>
  );
}

/* ─── Login kerak ekrani ─── */
function LoginRequired({ onClose }) {
  const navigate = useNavigate();
  function goLogin()    { onClose(); navigate("/login");    }
  function goRegister() { onClose(); navigate("/register"); }

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "2rem", gap: "1rem", textAlign: "center",
    }}>
      <div style={{ fontSize: "3rem" }}>🔒</div>
      <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary,#1a1a1a)" }}>
        AI maslahatdan foydalanish uchun kirish kerak
      </h3>
      <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-secondary,#666)", lineHeight: 1.5 }}>
        Ro'yxatdan o'ting yoki tizimga kiring — <strong>bepul</strong> va bir daqiqa vaqt oladi.
      </p>
      <div style={{
        background: "var(--bg-soft,#f9f6f0)", borderRadius: 12,
        padding: "1rem 1.5rem", width: "100%", maxWidth: 280,
        border: "1px solid var(--border,#e8e3dc)",
      }}>
        <div style={{ fontSize: "0.82rem", color: "var(--text-secondary,#666)", lineHeight: 1.8 }}>
          ✅ Kuniga <strong>20 ta</strong> bepul savol<br/>
          ✅ Barcha suhbatlar saqlanadi<br/>
          ✅ O'zbek, Rus, Ingliz tillarida<br/>
          ✅ 24/7 ishlaydi
        </div>
      </div>
      <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}>
        <button onClick={goRegister} style={{
          padding: "0.65rem 1.6rem", background: "var(--accent,#8b6914)",
          color: "#fff", border: "none", borderRadius: 8, fontSize: "0.9rem",
          fontWeight: 700, cursor: "pointer",
        }}>
          Ro'yxatdan o'tish →
        </button>
        <button onClick={goLogin} style={{
          padding: "0.65rem 1.4rem", background: "transparent",
          color: "var(--accent,#8b6914)", border: "2px solid var(--accent,#8b6914)",
          borderRadius: 8, fontSize: "0.9rem", fontWeight: 600, cursor: "pointer",
        }}>
          Kirish
        </button>
      </div>
      <a href={TELEGRAM_URL} target="_blank" rel="noreferrer"
        style={{ fontSize: "0.82rem", color: "var(--text-secondary,#888)", marginTop: "0.25rem" }}>
        ✈ Telegram bot orqali ham foydalanishingiz mumkin
      </a>
    </div>
  );
}

export default function ChatDrawer() {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const { isOpen, closeChat } = useChatPanel();

  const uid = user?.id || null;

  const [view,        setView]        = useState("chat");
  const [messages,    setMessages]    = useState([]);
  const [input,       setInput]       = useState("");
  const [loading,     setLoading]     = useState(false);
  const [sessionId,   setSessionId]   = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [usage,       setUsage]       = useState(null);
  const [imageFile,   setImageFile]   = useState(null);   // tanlangan rasm
  const [imagePreview, setImagePreview] = useState(null); // preview URL

  const bottomRef      = useRef(null);
  const textaRef       = useRef(null);
  const initializedRef = useRef(false);
  const saveTimerRef   = useRef(null);

  const refreshHistory = useCallback(async () => {
    if (!user) return;
    const local = loadHistory(uid);
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const { data } = await api.get("/chat/sessions");
        const apiSessions = (data.sessions || []).map((sess) => ({
          sessionId:    sess.sessionId,
          title:        sess.firstQuestion || t.drawer_no_title,
          updatedAt:    new Date(sess.updatedAt).getTime(),
          messageCount: sess.messageCount,
          source:       "api",
        }));
        const apiIds  = new Set(apiSessions.map((a) => a.sessionId));
        const merged  = [
          ...apiSessions,
          ...local.filter((h) => !apiIds.has(h.sessionId)),
        ].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        setHistoryList(merged.slice(0, 30));
        return;
      } catch { /* fallback */ }
    }
    setHistoryList(local);
  }, [user, uid, t.drawer_no_title]);

  const refreshUsage = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get("/chat/usage");
      setUsage(data);
    } catch { /* silent */ }
  }, [user]);

  const restoreSession = useCallback(async (sid) => {
    if (!sid || !user) return;
    setLoading(true);
    setView("chat");
    setSessionId(sid);
    setActiveSessionId(sid, uid);
    const stored = getStoredSession(sid, uid);
    if (stored?.messages?.length) {
      setMessages(stored.messages);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get(`/chat/${sid}`);
      setMessages(data.messages || []);
      upsertSession({ sessionId: sid, messages: data.messages || [], userId: uid });
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [user, uid]);

  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = "";
      initializedRef.current = false;
      return;
    }
    document.body.style.overflow = "hidden";
    if (!user) return;

    clearGuestData();
    refreshHistory();
    refreshUsage();

    if (!initializedRef.current) {
      initializedRef.current = true;
      const active = getActiveSessionId(uid);
      if (active) {
        const stored = getStoredSession(active, uid);
        if (stored?.messages?.length) {
          setSessionId(active);
          setMessages(stored.messages);
          setView("chat");
        } else {
          restoreSession(active);
        }
      } else {
        const id = newUserSessionId(uid);
        setSessionId(id);
        setActiveSessionId(id, uid);
      }
      setTimeout(() => textaRef.current?.focus(), 100);
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen, user, uid, refreshHistory, refreshUsage, restoreSession]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, isOpen, view]);

  useEffect(() => {
    if (!sessionId || messages.length === 0) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      upsertSession({ sessionId, messages, userId: uid });
      setActiveSessionId(sessionId, uid);
      refreshHistory();
    }, 400);
    return () => clearTimeout(saveTimerRef.current);
  }, [messages, sessionId, uid, refreshHistory]);

  const startNew = useCallback(() => {
    if (!user) return;
    setMessages([]);
    setView("chat");
    const id = newUserSessionId(uid);
    setSessionId(id);
    setActiveSessionId(id, uid);
  }, [user, uid]);

  async function openHistoryItem(item)  { await restoreSession(item.sessionId); }

  async function deleteHistoryItem(e, sid) {
    e.stopPropagation();
    deleteStoredSession(sid, uid);
    try { await api.delete(`/chat/${sid}`); } catch { /* silent */ }
    if (sessionId === sid) startNew();
    refreshHistory();
  }

  async function send(msgText) {
    if (!user) return;
    const text = (msgText ?? input).trim();
    if (!text || loading) return;
    setInput("");
    setView("chat");

    // Use existing sessionId or let backend create new one
    const sid = sessionId || null;

    // Rasim preview ni ko'rsatish
    const sentImage = imagePreview;
    setMessages((prev) => [...prev, {
      role: "user",
      content: text,
      imagePreview: sentImage || undefined,
    }]);
    setLoading(true);

    // Rasmni tozalash (yuborishdan oldin)
    const fileToSend = imageFile;
    setImageFile(null);
    setImagePreview(null);

    try {
      let data;
      if (fileToSend) {
        // FormData bilan yuborish
        const formData = new FormData();
        formData.append("message", text);
        if (sid) formData.append("sessionId", sid);
        formData.append("lang", lang);
        formData.append("image", fileToSend);
        const resp = await api.post("/chat", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        data = resp.data;
      } else {
        const resp = await api.post("/chat", { message: text, sessionId: sid, lang });
        data = resp.data;
      }
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
      setSessionId(data.sessionId);
      setActiveSessionId(data.sessionId, uid);
      if (data.usage) setUsage(data.usage);
    } catch (err) {
      const errData = err.response?.data;
      const msg = errData?.error || t.chat_error || "Xatolik yuz berdi";
      if (errData?.limitExceeded) {
        setUsage({ used: errData.used, limit: errData.limit, remaining: 0 });
      }
      setMessages((prev) => [...prev, { role: "assistant", content: `❌ ${msg}`, isError: true }]);
    } finally {
      setLoading(false);
      textaRef.current?.focus();
    }
  }

  function onKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  function onPaste(e) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (!file) continue;
        if (file.size > 5 * 1024 * 1024) {
          alert("Rasm hajmi 5MB dan oshmasligi kerak");
          return;
        }
        e.preventDefault();
        setImageFile(file);
        const url = URL.createObjectURL(file);
        setImagePreview(url);
        return;
      }
    }
  }
  if (!isOpen) return null;

  const limitReached = usage && usage.remaining === 0;

  return (
    <>
      <div className={s.backdrop} onClick={closeChat} aria-hidden="true" />
      <aside className={s.drawer} role="dialog" aria-modal="true" aria-label={t.drawer_title}>
        <header className={s.header}>
          <div className={s.headerLeft}>
            <a href="/" className={s.headerIcon}><img width={30} src={favicon} alt="" /></a>
          </div>
          <div className={s.headerRight}>
            {user && usage && <UsageBadge usage={usage} />}
            {user && (
              view === "chat"
                ? <button type="button" className={s.historyBtn}
                    onClick={() => { refreshHistory(); setView("history"); }}
                    title={t.drawer_history}><History size={18} /></button>
                : <button type="button" className={s.historyBtn}
                    onClick={() => setView("chat")} title={t.drawer_back_chat}><MessageSquare size={18} /></button>
            )}
            <LangSwitcher dark compact />
            <button type="button" className={s.closeBtn} onClick={closeChat} aria-label={t.drawer_close}><X size={18} /></button>
          </div>
        </header>

        {!user ? (
          <LoginRequired onClose={closeChat} />

        ) : view === "history" ? (
          <div className={s.historyArea}>
            <button type="button" className={s.newChatFull} onClick={startNew}>
              + {t.drawer_new_chat}
            </button>
            {historyList.length === 0
              ? <p className={s.emptyHistory}>{t.drawer_no_history}</p>
              : historyList.map((item) => (
                <div key={item.sessionId}
                  className={`${s.historyItem} ${sessionId === item.sessionId ? s.historyActive : ""}`}
                  onClick={() => openHistoryItem(item)}
                  role="button" tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && openHistoryItem(item)}>
                  <div className={s.historyMeta}>
                    <span className={s.historyTitle}>{item.title}</span>
                    <button type="button" className={s.historyDelete}
                      onClick={(e) => deleteHistoryItem(e, item.sessionId)} aria-label="Delete"><Trash2 size={14} /></button>
                  </div>
                  <span className={s.historyDate}>
                    {item.updatedAt ? formatDate(item.updatedAt, lang) : ""}
                    {item.messageCount ? ` · ${item.messageCount} ${t.chat_messages || "xabar"}` : ""}
                  </span>
                </div>
              ))
            }
          </div>

        ) : (
          <>
            <div className={s.msgArea}>
              {messages.length === 0 && !loading && (
                <div className={s.welcome}>
                  <div className={s.wIcon}><img width={40} src={favicon} alt="" /></div>
                  <h3>{t.chat_welcome_title}{user ? `, ${user.fullName || user.username}` : ""}!</h3>
                  <p>{t.chat_welcome_desc}</p>
                  <div className={s.quickGrid}>
                    {(t.quick_questions || []).slice(0, 4).map((q) => (
                      <button key={q} type="button" className={s.quickBtn} onClick={() => send(q)}>{q}</button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={`${s.msg} ${s[m.role]}`} style={{ animationDelay: `${i * 0.04}s` }}>
                  {m.role === "assistant" && <div className={s.avatar}>⚖</div>}
                  <div className={`${s.bubble} ${m.isError ? s.errBubble : ""}`}>
                    {m.role === "assistant" ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                        p:      (p) => <p className={s.mdP} {...p} />,
                        strong: (p) => <strong className={s.mdB} {...p} />,
                        ul:     (p) => <ul className={s.mdUl} {...p} />,
                        ol:     (p) => <ol className={s.mdOl} {...p} />,
                        li:     (p) => <li className={s.mdLi} {...p} />,
                      }}>
                        {m.content}
                      </ReactMarkdown>
                    ) : (
                      <>
                        {m.imagePreview && (
                          <img src={m.imagePreview} alt="yuklangan rasm"
                            style={{ maxWidth: "100%", maxHeight: 180, borderRadius: 8, display: "block", marginBottom: 6 }} />
                        )}
                        <p>{m.content}</p>
                      </>
                    )}
                  </div>
                  {m.role === "user" && (
                    <div className={s.avatarU}>{user?.username?.[0]?.toUpperCase() || "?"}</div>
                  )}
                </div>
              ))}

              {loading && (
                <div className={`${s.msg} ${s.assistant}`}>
                  <div className={s.avatar}>⚖</div>
                  <div className={s.bubble}><div className={s.typing}><span /><span /><span /></div></div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {limitReached && (
              <div style={{
                padding: "0.75rem 1rem", background: "#fef2f2",
                borderTop: "1px solid #fecaca", textAlign: "center",
                fontSize: "0.82rem", color: "#dc2626",
              }}>
                ⚠️ Kunlik limit tugadi ({usage.limit} ta savol). Ertaga qayta foydalanishingiz mumkin.
              </div>
            )}

            <footer className={s.inputBar}>
              <button type="button" className={s.newChatBtn} onClick={startNew} title={t.drawer_new_chat}><RefreshCw size={18} /></button>
              <div className={s.inputWrap}>
                {/* Rasm preview */}
                {imagePreview && (
                  <div style={{
                    position: "relative", display: "inline-block",
                    margin: "4px 8px 4px 0", flexShrink: 0,
                  }}>
                    <img src={imagePreview} alt="preview" style={{
                      width: 48, height: 48, objectFit: "cover",
                      borderRadius: 8, border: "2px solid var(--accent,#8b6914)",
                      display: "block",
                    }} />
                    <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); }}
                      style={{
                        position: "absolute", top: -6, right: -6,
                        background: "#dc2626", color: "#fff", border: "none",
                        borderRadius: "50%", width: 18, height: 18,
                        fontSize: 11, cursor: "pointer", lineHeight: "18px",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        padding: 0,
                      }}><X size={12} /></button>
                  </div>
                )}
                <textarea ref={textaRef} className={s.ta} rows={1}
                  value={input} disabled={loading || limitReached}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKey}
                  onPaste={onPaste}
                  placeholder={limitReached ? "Kunlik limit tugadi..." : t.chat_placeholder}
                />
                {/* Rasm yuklash tugmasi */}
                {!limitReached && (
                  <>
                    <input
                      type="file" accept="image/*" id="chat-image-input"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 5 * 1024 * 1024) {
                          alert("Rasm hajmi 5MB dan oshmasligi kerak");
                          return;
                        }
                        setImageFile(file);
                        const url = URL.createObjectURL(file);
                        setImagePreview(url);
                        e.target.value = "";
                      }}
                    />
                    <button type="button"
                      onClick={() => document.getElementById("chat-image-input")?.click()}
                      disabled={loading}
                      title="Rasm yuklash"
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        fontSize: 18, padding: "0 4px", opacity: loading ? 0.4 : 0.7,
                        flexShrink: 0, display: "flex", alignItems: "center",
                      }}><Paperclip size={18} /></button>
                  </>
                )}
                <button type="button" className={s.sendBtn}
                  onClick={() => send()} disabled={(!input.trim() && !imageFile) || loading || limitReached}>
                  {loading ? "…" : <Send size={18} />}
                </button>
              </div>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}
