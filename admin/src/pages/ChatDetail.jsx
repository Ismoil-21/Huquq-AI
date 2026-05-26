import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../utils/api";
import { Badge, Btn, Loader } from "../components/Shared";
import s from "./ChatDetail.module.css";
import { Smartphone, Globe } from "lucide-react";


const CAT_LABELS = {
  mehnat:"Mehnat", oila:"Oila", meros:"Meros",
  yer:"Yer", istemolchi:"Iste'molchi", jinoiy:"Jinoyat", boshqa:"Boshqa",
};

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("uz-UZ", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" });
}

export default function ChatDetail() {
  const { sessionId } = useParams();
  const nav = useNavigate();
  const [chat, setChat]   = useState(null);
  const [loading, setLoad] = useState(true);
  const [err, setErr]     = useState("");

  useEffect(() => {
    api.get(`/admin/chats/${sessionId}`)
      .then(({ data }) => setChat(data))
      .catch(() => setErr("Suhbat topilmadi yoki xatolik"))
      .finally(() => setLoad(false));
  }, [sessionId]);

  async function remove() {
    if (!confirm("Suhbatni o'chirishni tasdiqlaysizmi?")) return;
    await api.delete(`/admin/chats/${sessionId}`);
    nav("/chats");
  }

  if (loading) return <Loader />;
  if (err)     return <div style={{ color:"var(--red)", padding:"2rem" }}>{err}</div>;
  if (!chat)   return null;

  return (
    <div className={s.page}>
      <div className={s.header}>
        <button className={s.back} onClick={() => nav(-1)}>← Orqaga</button>
        <div className={s.headerInfo}>
          <h1 className={s.title}>Suhbat tafsiloti</h1>
          <div className={s.meta}>
            <Badge type={chat.source}>{chat.source === "web" ? <><Globe size={12} /> Web</> : chat.source === "mobile" ? <><Smartphone size={12} /> Mobile</> : <><Smartphone size={12} /> Telegram</>}</Badge>
            <Badge type={chat.category}>{CAT_LABELS[chat.category] || chat.category}</Badge>
            <span className={s.metaItem}>👤 {chat.userId?.username || chat.telegramUsername || "anonim"}</span>
            <span className={s.metaItem}>📅 {fmtDate(chat.createdAt)}</span>
            <span className={s.metaItem}>💬 {chat.messages.length} xabar</span>
          </div>
        </div>
        <Btn variant="danger" small onClick={remove}>🗑 O'chirish</Btn>
      </div>

      <div className={s.messages}>
        {chat.messages.map((m, i) => (
          <div key={i} className={`${s.msg} ${s[m.role]}`}>
            <div className={s.msgRole}>
              {m.role === "user" ? "Foydalanuvchi" : "AI Maslahatchi"}
            </div>
            {m.imageData && (
              <div style={{ marginBottom: 8 }}>
                <img
                  src={`data:${m.imageMimeType || "image/jpeg"};base64,${m.imageData}`}
                  alt="yuklangan rasm"
                  style={{
                    maxWidth: "100%", maxHeight: 320,
                    borderRadius: 8, border: "1px solid var(--border, #e0e0e0)",
                    display: "block",
                  }}
                />
              </div>
            )}
            <div className={s.msgContent}>{m.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
