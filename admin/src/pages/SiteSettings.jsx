import React, { useEffect, useState } from "react";
import api from "../utils/api";
import { Card, Loader, PageHeader } from "../components/Shared";
import s from "./Settings.module.css";

export default function SiteSettings() {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/admin/site-content");
      setContent(data);
    } catch (err) {
      console.error("Error fetching site content:", err);
      setMessage("Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage("");
      await api.put("/admin/site-content", content);
      setMessage("Saqlandi");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error("Error saving site content:", err);
      setMessage("Xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (section, field, value) => {
    setContent((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  if (loading) return <Loader />;

  return (
    <div className={s.page}>
      <PageHeader title="⚙️ Sayt sozlamalari" />

      {message && (
        <div style={{
          padding: "1rem",
          marginBottom: "1rem",
          borderRadius: "8px",
          background: message === "Saqlandi" ? "var(--green-bg)" : "var(--red-bg)",
          color: message === "Saqlandi" ? "var(--green)" : "var(--red)",
        }}>
          {message}
        </div>
      )}

      {/* Stats Section */}
      <Card title="Statistika" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text2)" }}>
              Tajriba (qiymat)
            </label>
            <input
              type="text"
              value={content?.stats?.experience || ""}
              onChange={(e) => handleChange("stats", "experience", e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                background: "var(--bg)",
                color: "var(--text)",
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text2)" }}>
              Tajriba (label)
            </label>
            <input
              type="text"
              value={content?.stats?.experienceLabel || ""}
              onChange={(e) => handleChange("stats", "experienceLabel", e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                background: "var(--bg)",
                color: "var(--text)",
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text2)" }}>
              Ishlar (qiymat)
            </label>
            <input
              type="text"
              value={content?.stats?.cases || ""}
              onChange={(e) => handleChange("stats", "cases", e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                background: "var(--bg)",
                color: "var(--text)",
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text2)" }}>
              Ishlar (label)
            </label>
            <input
              type="text"
              value={content?.stats?.casesLabel || ""}
              onChange={(e) => handleChange("stats", "casesLabel", e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                background: "var(--bg)",
                color: "var(--text)",
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text2)" }}>
              Mijozlar (qiymat)
            </label>
            <input
              type="text"
              value={content?.stats?.clients || ""}
              onChange={(e) => handleChange("stats", "clients", e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                background: "var(--bg)",
                color: "var(--text)",
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text2)" }}>
              Mijozlar (label)
            </label>
            <input
              type="text"
              value={content?.stats?.clientsLabel || ""}
              onChange={(e) => handleChange("stats", "clientsLabel", e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                background: "var(--bg)",
                color: "var(--text)",
              }}
            />
          </div>
        </div>
      </Card>

      {/* Hero Section */}
      <Card title="🎯 Hero bo'limi" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "grid", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text2)" }}>
              Sarlavha
            </label>
            <input
              type="text"
              value={content?.hero?.title || ""}
              onChange={(e) => handleChange("hero", "title", e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                background: "var(--bg)",
                color: "var(--text)",
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text2)" }}>
              Qisqa izoh
            </label>
            <textarea
              value={content?.hero?.subtitle || ""}
              onChange={(e) => handleChange("hero", "subtitle", e.target.value)}
              rows={3}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                background: "var(--bg)",
                color: "var(--text)",
                resize: "vertical",
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text2)" }}>
              Tugma matni
            </label>
            <input
              type="text"
              value={content?.hero?.cta || ""}
              onChange={(e) => handleChange("hero", "cta", e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                background: "var(--bg)",
                color: "var(--text)",
              }}
            />
          </div>
        </div>
      </Card>

      {/* About Section */}
      <Card title="ℹ️ Biz haqimizda" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "grid", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text2)" }}>
              Sarlavha
            </label>
            <input
              type="text"
              value={content?.about?.title || ""}
              onChange={(e) => handleChange("about", "title", e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                background: "var(--bg)",
                color: "var(--text)",
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text2)" }}>
              Qisqa izoh (lead)
            </label>
            <input
              type="text"
              value={content?.about?.lead || ""}
              onChange={(e) => handleChange("about", "lead", e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                background: "var(--bg)",
                color: "var(--text)",
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text2)" }}>
              Asosiy matn
            </label>
            <textarea
              value={content?.about?.text || ""}
              onChange={(e) => handleChange("about", "text", e.target.value)}
              rows={5}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                background: "var(--bg)",
                color: "var(--text)",
                resize: "vertical",
              }}
            />
          </div>
        </div>
      </Card>

      {/* Contact Section */}
      <Card title="📞 Aloqa ma'lumotlari" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text2)" }}>
              Manzil
            </label>
            <input
              type="text"
              value={content?.contact?.address || ""}
              onChange={(e) => handleChange("contact", "address", e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                background: "var(--bg)",
                color: "var(--text)",
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text2)" }}>
              Telefon
            </label>
            <input
              type="text"
              value={content?.contact?.phone || ""}
              onChange={(e) => handleChange("contact", "phone", e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                background: "var(--bg)",
                color: "var(--text)",
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text2)" }}>
              Email
            </label>
            <input
              type="email"
              value={content?.contact?.email || ""}
              onChange={(e) => handleChange("contact", "email", e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                background: "var(--bg)",
                color: "var(--text)",
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text2)" }}>
              Ish vaqti (hafta)
            </label>
            <input
              type="text"
              value={content?.contact?.hoursWeek || ""}
              onChange={(e) => handleChange("contact", "hoursWeek", e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                background: "var(--bg)",
                color: "var(--text)",
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text2)" }}>
              Ish vaqti (shanba)
            </label>
            <input
              type="text"
              value={content?.contact?.hoursSat || ""}
              onChange={(e) => handleChange("contact", "hoursSat", e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                background: "var(--bg)",
                color: "var(--text)",
              }}
            />
          </div>
        </div>
      </Card>

      {/* Social Section */}
      <Card title="Ijtimoiy tarmoqlar" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text2)" }}>
              Telegram
            </label>
            <input
              type="url"
              value={content?.social?.telegram || ""}
              onChange={(e) => handleChange("social", "telegram", e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                background: "var(--bg)",
                color: "var(--text)",
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text2)" }}>
              Instagram
            </label>
            <input
              type="url"
              value={content?.social?.instagram || ""}
              onChange={(e) => handleChange("social", "instagram", e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                background: "var(--bg)",
                color: "var(--text)",
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text2)" }}>
              Facebook
            </label>
            <input
              type="url"
              value={content?.social?.facebook || ""}
              onChange={(e) => handleChange("social", "facebook", e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                background: "var(--bg)",
                color: "var(--text)",
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text2)" }}>
              YouTube
            </label>
            <input
              type="url"
              value={content?.social?.youtube || ""}
              onChange={(e) => handleChange("social", "youtube", e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                background: "var(--bg)",
                color: "var(--text)",
              }}
            />
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          padding: "1rem 2rem",
          background: "var(--accent)",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          fontSize: "1rem",
          fontWeight: 600,
          cursor: saving ? "not-allowed" : "pointer",
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? "Saqlanmoqda..." : "Saqlash"}
      </button>
    </div>
  );
}
