import React, { useEffect, useState } from "react";
import api from "../utils/api";
import { Card, Loader, PageHeader } from "../components/Shared";
import s from "./Table.module.css";

export default function Visitors() {
  const [visitors, setVisitors] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchVisitors();
    fetchStats();
  }, [page, search]);

  const fetchVisitors = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/admin/visitors", {
        params: { page, limit: 30, search: search || undefined },
      });
      setVisitors(data.visitors);
      setTotal(data.total);
    } catch (err) {
      console.error("Error fetching visitors:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data } = await api.get("/admin/visitors/stats");
      setStats(data);
    } catch (err) {
      console.error("Error fetching visitor stats:", err);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString("uz-UZ", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading && visitors.length === 0) return <Loader />;

  return (
    <div className={s.page}>
      <PageHeader title="Tashrif buyuruvchilar" />

      {/* Stats cards */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
          <Card style={{ padding: "1rem" }}>
            <div style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--accent)" }}>{stats.totalVisitors}</div>
            <div style={{ color: "var(--text2)", fontSize: "0.9rem" }}>Jami tashriflar</div>
          </Card>
          <Card style={{ padding: "1rem" }}>
            <div style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--green)" }}>{stats.todayVisitors}</div>
            <div style={{ color: "var(--text2)", fontSize: "0.9rem" }}>Bugun</div>
          </Card>
          <Card style={{ padding: "1rem" }}>
            <div style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--purple)" }}>{stats.uniqueIps}</div>
            <div style={{ color: "var(--text2)", fontSize: "0.9rem" }}>Noyob IP manzillar</div>
          </Card>
        </div>
      )}

      {/* Search */}
      <Card style={{ marginBottom: "1rem", padding: "1rem" }}>
        <input
          type="text"
          placeholder="IP, mamlakat yoki shahar bo'yicha qidirish..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={{
            width: "100%",
            padding: "0.75rem",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            background: "var(--bg)",
            color: "var(--text)",
            fontSize: "0.95rem",
          }}
        />
      </Card>

      {/* Table */}
      <Card>
        <div style={{ overflowX: "auto" }}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>IP Manzil</th>
                <th>Qurilma</th>
                <th>OS</th>
                <th>Brauzer</th>
                <th>Mamlakat</th>
                <th>Shahar</th>
                <th>Tashriflar soni</th>
                <th>Oxirgi tashrif</th>
                <th>Birinchi tashrif</th>
              </tr>
            </thead>
            <tbody>
              {visitors.map((v) => (
                <tr key={v._id}>
                  <td style={{ fontFamily: "monospace", fontWeight: "bold" }}>{v.ip}</td>
                  <td>{v.device || "-"}</td>
                  <td>{v.os || "-"}</td>
                  <td>{v.browser || "-"}</td>
                  <td>{v.country || "-"}</td>
                  <td>{v.city || "-"}</td>
                  <td style={{ textAlign: "center" }}>{v.visitCount}</td>
                  <td>{formatDate(v.lastVisit)}</td>
                  <td>{formatDate(v.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 30 && (
          <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                padding: "0.5rem 1rem",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                background: "var(--bg)",
                color: "var(--text)",
                cursor: page === 1 ? "not-allowed" : "pointer",
                opacity: page === 1 ? 0.5 : 1,
              }}
            >
              Oldingi
            </button>
            <span style={{ padding: "0.5rem 1rem", color: "var(--text2)" }}>
              Sahifa {page} / {Math.ceil(total / 30)}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= Math.ceil(total / 30)}
              style={{
                padding: "0.5rem 1rem",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                background: "var(--bg)",
                color: "var(--text)",
                cursor: page >= Math.ceil(total / 30) ? "not-allowed" : "pointer",
                opacity: page >= Math.ceil(total / 30) ? 0.5 : 1,
              }}
            >
              Keyingi
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
