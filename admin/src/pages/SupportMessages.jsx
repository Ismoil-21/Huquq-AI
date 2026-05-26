import React, { useState, useEffect } from "react";
import axios from "axios";
import s from "./Table.module.css";

const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("adminToken");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export default function SupportMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, pending, resolved

  useEffect(() => {
    loadMessages();
  }, []);

  async function loadMessages() {
    try {
      setLoading(true);
      const { data } = await api.get("/support");
      setMessages(data);
      // Mark all pending messages as read
      const pendingIds = data.filter(m => m.status === "pending" && !m.read).map(m => m._id);
      if (pendingIds.length > 0) {
        await Promise.all(pendingIds.map(id => api.patch(`/support/${id}`, { read: true })));
      }
    } catch (err) {
      console.error("Xabar yuklashda xatolik:", err);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id, status) {
    try {
      await api.patch(`/support/${id}`, { status });
      setMessages(messages.map(m => m._id === id ? { ...m, status } : m));
    } catch (err) {
      console.error("Status o'zgartirishda xatolik:", err);
    }
  }

  async function deleteMessage(id) {
    if (!confirm("Rostdan ham o'chirmoqchimisiz?")) return;
    try {
      await api.delete(`/support/${id}`);
      setMessages(messages.filter(m => m._id !== id));
    } catch (err) {
      console.error("Xabarni o'chirishda xatolik:", err);
    }
  }

  const filtered = messages.filter(m => {
    if (filter === "all") return true;
    return m.status === filter;
  });

  const pendingCount = messages.filter(m => m.status === "pending").length;

  return (
    <div style={{ padding: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1 style={{ margin: 0, fontSize: "24px", color: "var(--text)" }}>
          Texnik yordam xabarlari
          {pendingCount > 0 && (
            <span style={{ 
              marginLeft: "1rem", 
              background: "var(--accent)", 
              color: "#fff", 
              padding: "2px 10px", 
              borderRadius: "12px", 
              fontSize: "14px" 
            }}>
              {pendingCount} yangi
            </span>
          )}
        </h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button 
            onClick={() => setFilter("all")}
            style={{ 
              padding: "8px 16px", 
              borderRadius: "8px", 
              border: filter === "all" ? "2px solid var(--accent)" : "1px solid var(--border)",
              background: filter === "all" ? "var(--accent-bg)" : "var(--bg)",
              color: "var(--text)",
              cursor: "pointer"
            }}
          >
            Barchasi ({messages.length})
          </button>
          <button 
            onClick={() => setFilter("pending")}
            style={{ 
              padding: "8px 16px", 
              borderRadius: "8px", 
              border: filter === "pending" ? "2px solid var(--accent)" : "1px solid var(--border)",
              background: filter === "pending" ? "var(--accent-bg)" : "var(--bg)",
              color: "var(--text)",
              cursor: "pointer"
            }}
          >
            Kutilmoqda ({pendingCount})
          </button>
          <button 
            onClick={() => setFilter("resolved")}
            style={{ 
              padding: "8px 16px", 
              borderRadius: "8px", 
              border: filter === "resolved" ? "2px solid var(--accent)" : "1px solid var(--border)",
              background: filter === "resolved" ? "var(--accent-bg)" : "var(--bg)",
              color: "var(--text)",
              cursor: "pointer"
            }}
          >
            Hal qilindi ({messages.filter(m => m.status === "resolved").length})
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "var(--text2)" }}>
          Yuklanmoqda...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--text2)" }}>
          Xabarlar yo'q
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {filtered.map(msg => (
            <div 
              key={msg._id}
              style={{ 
                background: "var(--card)", 
                border: "1px solid var(--border)", 
                borderRadius: "12px", 
                padding: "1.5rem",
                borderLeft: msg.status === "pending" ? "4px solid var(--accent)" : "4px solid #10b981"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "16px", color: "var(--text)", marginBottom: "0.25rem" }}>
                    {msg.name || "Noma'lum"}
                  </div>
                  <div style={{ fontSize: "14px", color: "var(--text2)" }}>
                    {msg.email || "Email yo'q"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <span style={{ 
                    padding: "4px 12px", 
                    borderRadius: "20px", 
                    fontSize: "12px", 
                    fontWeight: 500,
                    background: msg.status === "pending" ? "var(--accent-bg)" : "#d1fae5",
                    color: msg.status === "pending" ? "var(--accent)" : "#10b981"
                  }}>
                    {msg.status === "pending" ? "Kutilmoqda" : "Hal qilindi"}
                  </span>
                  <span style={{ fontSize: "12px", color: "var(--text2)" }}>
                    {new Date(msg.createdAt).toLocaleString("uz-UZ")}
                  </span>
                </div>
              </div>
              <div style={{ 
                background: "var(--bg)", 
                padding: "1rem", 
                borderRadius: "8px", 
                fontSize: "14px", 
                color: "var(--text)",
                lineHeight: "1.6"
              }}>
                {msg.message}
              </div>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                {msg.status === "pending" ? (
                  <button 
                    onClick={() => updateStatus(msg._id, "resolved")}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "8px",
                      border: "none",
                      background: "#10b981",
                      color: "#fff",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: 500
                    }}
                  >
                    Hal qildi
                  </button>
                ) : (
                  <button 
                    onClick={() => updateStatus(msg._id, "pending")}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      background: "var(--bg)",
                      color: "var(--text)",
                      cursor: "pointer",
                      fontSize: "14px"
                    }}
                  >
                    Qayta ochish
                  </button>
                )}
                <button 
                  onClick={() => deleteMessage(msg._id)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: "1px solid #ef4444",
                    background: "transparent",
                    color: "#ef4444",
                    cursor: "pointer",
                    fontSize: "14px"
                  }}
                >
                  O'chirish
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
