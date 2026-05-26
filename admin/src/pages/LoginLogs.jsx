import { Smartphone, Tablet, Monitor, Key } from "lucide-react";
import React, { useState, useEffect, useCallback } from "react";
import api from "../utils/api";
import { PageHeader, Btn, Loader, EmptyState, Pagination } from "../components/Shared";
import s from "./Table.module.css";

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("uz-UZ", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

const deviceIconMap = { Mobile: <Smartphone size={14} />, Tablet: <Tablet size={14} />, Desktop: <Monitor size={14} /> };
const sourceStyle = {
  google:   { bg: "#e8f5e9", color: "#2e7d32", label: "🔵 Google" },
  web:      { bg: "#e3f2fd", color: "#1565c0", label: "Parol"  },
  telegram: { bg: "#e1f5fe", color: "#0277bd", label: "✈️ Telegram" },
};

export default function LoginLogs() {
  const [logs,    setLogs]    = useState([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [pages,   setPages]   = useState(1);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/logins?page=${page}&limit=30`);
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <PageHeader title={`🔐 Kirish tarixi (${total})`}>
        <Btn variant="ghost" onClick={load}>🔄 Yangilash</Btn>
      </PageHeader>

      {loading && <Loader />}
      {!loading && logs.length === 0 && <EmptyState icon="🔐" text="Kirish tarixi topilmadi" />}

      {!loading && logs.length > 0 && (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Vaqt</th>
                <th>Foydalanuvchi</th>
                <th>Email</th>
                <th>Qurilma</th>
                <th>OS</th>
                <th>Brauzer</th>
                <th>Usul</th>
                <th>IP manzil</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l, i) => {
                const src = sourceStyle[l.source] || sourceStyle.web;
                return (
                  <tr key={i}>
                    <td className={s.nowrap} style={{ fontSize: "0.8rem" }}>{fmtDate(l.createdAt)}</td>
                    <td>
                      {l.userId
                        ? <span className={s.username}>@{l.userId.username}</span>
                        : <span className={s.anon}>—</span>
                      }
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      {l.userId?.email || <span className={s.anon}>—</span>}
                    </td>
                    <td>
                      <span title={l.device}>
                        {deviceIconMap[l.device] || "💻"} {l.device || "—"}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.82rem" }}>{l.os || "—"}</td>
                    <td style={{ fontSize: "0.82rem" }}>{l.browser || "—"}</td>
                    <td>
                      <span style={{
                        padding: "2px 8px", borderRadius: "4px", fontSize: "0.75rem",
                        background: src.bg, color: src.color,
                      }}>
                        {src.label}
                      </span>
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
                      {l.ip || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} pages={pages} onChange={setPage} />
    </div>
  );
}
