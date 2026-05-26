import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  MessageSquare, RefreshCw, Trash2, Eye,
  Briefcase, Users, Home, ShoppingCart, Gavel, FileText,
  Smartphone, Globe, ChevronDown, ChevronRight, Paperclip,
} from "lucide-react";
import api from "../utils/api";
import { PageHeader, SearchBar, Select, Badge, Btn, Loader, EmptyState, Pagination } from "../components/Shared";
import s from "./Table.module.css";

const CAT_LABELS = {
  mehnat:     <><Briefcase size={14} /> Mehnat</>,
  oila:       <><Users size={14} /> Oila</>,
  meros:      <><Home size={14} /> Meros</>,
  yer:        <><FileText size={14} /> Yer</>,
  istemolchi: <><ShoppingCart size={14} /> Iste'molchi</>,
  jinoiy:     <><Gavel size={14} /> Jinoyat</>,
  boshqa:     <><FileText size={14} /> Boshqa</>,
};
const CAT_OPTS = Object.entries(CAT_LABELS).map(([v, label]) => ({ value: v, label }));

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("uz-UZ", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// Bitta foydalanuvchining barcha suhbatlarini accordion ichida ko'rsatadi
function UserChatRow({ group, onDelete, loading }) {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const { userKey, displayName, fullName, source, chats } = group;

  const totalMsgs = chats.reduce((acc, c) => acc + c.messageCount, 0);
  const lastDate  = chats[0]?.updatedAt;

  return (
    <>
      {/* Asosiy qator — foydalanuvchi */}
      <tr
        className={`${s.groupRow} ${open ? s.groupRowOpen : ""}`}
        onClick={() => setOpen((p) => !p)}
        style={{ cursor: "pointer" }}
      >
        <td>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {open
              ? <ChevronDown size={14} style={{ color: "var(--text3)", flexShrink: 0 }} />
              : <ChevronRight size={14} style={{ color: "var(--text3)", flexShrink: 0 }} />
            }
            <span className={s.username}>{displayName}</span>
            {fullName && <span className={s.fullname}>{fullName}</span>}
          </div>
        </td>
        <td>
          {source === "web"      && <Badge type="web"><Globe size={12} /> Web</Badge>}
          {source === "telegram" && <Badge type="telegram"><Smartphone size={12} /> Telegram</Badge>}
          {source === "mobile"   && <Badge type="mobile"><Smartphone size={12} /> Mobile</Badge>}
          {!source && <Badge type="boshqa">Aralash</Badge>}
        </td>
        <td className={s.center}>
          <span className={s.count}>{chats.length} ta suhbat</span>
        </td>
        <td className={s.center}>
          <span className={s.count}>{totalMsgs}</span>
        </td>
        <td className={s.nowrap}>{fmtDate(lastDate)}</td>
        <td />
      </tr>

      {/* Kengaytirilgan — ichidagi suhbatlar */}
      {open && chats.map((c) => (
        <tr key={c.sessionId} className={s.subRow}>
          <td style={{ paddingLeft: 40 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {c.hasImage && <Paperclip size={12} style={{ color: "var(--text3)" }} />}
              <span className={s.truncate} title={c.firstQuestion} style={{ maxWidth: 280 }}>
                {c.firstQuestion || "—"}
              </span>
            </div>
          </td>
          <td>
            <Badge type={c.category}>{CAT_LABELS[c.category] || c.category}</Badge>
          </td>
          <td />
          <td className={s.center}>
            <span className={s.count}>{c.messageCount}</span>
          </td>
          <td className={s.nowrap}>{fmtDate(c.createdAt)}</td>
          <td>
            <div className={s.actions}>
              <Btn small variant="ghost" onClick={(e) => { e.stopPropagation(); nav(`/chats/${c.sessionId}`); }}>
                <Eye size={14} /> Ko'rish
              </Btn>
              <Btn
                small variant="danger"
                disabled={loading === c.sessionId}
                onClick={(e) => { e.stopPropagation(); onDelete(c.sessionId); }}
              >
                <Trash2 size={14} />
              </Btn>
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

// Chatlarni foydalanuvchi bo'yicha guruhlaydi
function groupByUser(chats) {
  const map = new Map();
  for (const c of chats) {
    const key = c.user?.username || c.telegramUsername || `anon_${c.sessionId.slice(0, 8)}`;
    if (!map.has(key)) {
      map.set(key, {
        userKey:     key,
        displayName: c.user?.username || c.telegramUsername || "anonim",
        fullName:    c.user?.fullName || "",
        source:      c.source,
        chats:       [],
      });
    }
    map.get(key).chats.push(c);
  }
  return Array.from(map.values());
}

export default function Chats() {
  const [chats,    setChats]    = useState([]);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [pages,    setPages]    = useState(1);
  const [search,   setSearch]   = useState("");
  const [source,   setSource]   = useState("");
  const [cat,      setCat]      = useState("");
  const [loading,  setLoading]  = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, limit: 50 });
      if (search) p.set("search", search);
      if (source) p.set("source", source);
      if (cat)    p.set("category", cat);
      const { data } = await api.get(`/admin/chats?${p}`);
      setChats(data.chats);
      setTotal(data.total);
      setPages(data.pages);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [page, search, source, cat]);

  useEffect(() => { load(); }, [load]);

  async function remove(sessionId) {
    if (!confirm("Suhbatni o'chirishni tasdiqlaysizmi?")) return;
    setDeleting(sessionId);
    try {
      await api.delete(`/admin/chats/${sessionId}`);
      load();
    } finally { setDeleting(null); }
  }

  const groups = groupByUser(chats);

  return (
    <div>
      <PageHeader title={<><MessageSquare size={20} /> Suhbatlar ({total})</>}>
        <Btn variant="ghost" onClick={load}><RefreshCw size={16} /> Yangilash</Btn>
      </PageHeader>

      <div className={s.filters}>
        <SearchBar
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Suhbat qidirish..."
        />
        <Select
          value={source}
          onChange={(v) => { setSource(v); setPage(1); }}
          placeholder="Barcha manbalar"
          options={[
            { value: "web",      label: <><Globe size={14} /> Web</> },
            { value: "telegram", label: <><Smartphone size={14} /> Telegram</> },
            { value: "mobile",   label: <><Smartphone size={14} /> Mobile</> },
          ]}
        />
        <Select
          value={cat}
          onChange={(v) => { setCat(v); setPage(1); }}
          placeholder="Barcha kategoriyalar"
          options={CAT_OPTS}
        />
      </div>

      {loading && <Loader />}
      {!loading && groups.length === 0 && (
        <EmptyState icon={<MessageSquare size={32} />} text="Suhbat topilmadi" />
      )}

      {!loading && groups.length > 0 && (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Foydalanuvchi / Savol</th>
                <th>Manba / Kategoriya</th>
                <th>Suhbatlar</th>
                <th>Xabarlar</th>
                <th>Sana</th>
                <th>Amal</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <UserChatRow
                  key={g.userKey}
                  group={g}
                  onDelete={remove}
                  loading={deleting}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} pages={pages} onChange={setPage} />
    </div>
  );
}
