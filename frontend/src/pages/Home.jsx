import React, { useEffect, useState } from "react";
import { useChatPanel } from "../context/ChatPanelContext";
import { useLang } from "../context/LangContext";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Calendar, Check, Smile } from "lucide-react";
import s from "./Home.module.css";

export default function Home() {
  const { openChat } = useChatPanel();
  const { t } = useLang();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [siteContent, setSiteContent] = useState(null);

  useEffect(() => {
    // Track visitor
    const trackVisitor = async () => {
      try {
        // Get IP address
        const ipResponse = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipResponse.json();
        
        // Get user agent info
        const userAgent = navigator.userAgent;
        const path = window.location.pathname;
        const referrer = document.referrer || "";
        
        // Simple device detection
        const device = /Mobile|Android|iPhone|iPad/i.test(userAgent) ? "Mobile" : "Desktop";
        
        // Simple OS detection
        let os = "Unknown";
        if (userAgent.includes("Windows")) os = "Windows";
        else if (userAgent.includes("Mac")) os = "MacOS";
        else if (userAgent.includes("Linux")) os = "Linux";
        else if (userAgent.includes("Android")) os = "Android";
        else if (userAgent.includes("iOS")) os = "iOS";
        
        // Simple browser detection
        let browser = "Unknown";
        if (userAgent.includes("Chrome")) browser = "Chrome";
        else if (userAgent.includes("Firefox")) browser = "Firefox";
        else if (userAgent.includes("Safari")) browser = "Safari";
        else if (userAgent.includes("Edge")) browser = "Edge";
        
        // Send visitor data to backend
        await fetch(`${import.meta.env.VITE_API_URL}/api/visitor/track`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ip: ipData.ip,
            userAgent,
            path,
            referrer,
            device,
            os,
            browser,
          }),
        });
      } catch (error) {
        console.error("Visitor tracking error:", error);
      }
    };
    
    // Fetch site content
    const fetchSiteContent = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/site/content`);
        const data = await response.json();
        setSiteContent(data);
      } catch (error) {
        console.error("Error fetching site content:", error);
      }
    };

    trackVisitor();
    fetchSiteContent();
  }, []);

  function handleAiClick() {
    if (!user) {
      navigate("/login");
      return;
    }
    openChat();
  }

  // Use backend content if available, otherwise fallback to translations
  const heroTitle = siteContent?.hero?.title || t.hero_title;
  const heroSubtitle = siteContent?.hero?.subtitle || t.hero_subtitle;
  const heroCta = siteContent?.hero?.cta || t.hero_cta;
  const telegramLink = siteContent?.social?.telegram || "https://t.me/mening_huquqlarim_bot";

  const stats = siteContent?.stats ? [
    { icon: <Calendar size={24} />, value: siteContent.stats.experience, label: siteContent.stats.experienceLabel },
    { icon: <Check size={24} />, value: siteContent.stats.cases, label: siteContent.stats.casesLabel },
    { icon: <Smile size={24} />, value: siteContent.stats.clients, label: siteContent.stats.clientsLabel },
  ] : t.stats;

  return (
    <>
      {/* Hero Section */}
      <section className={s.hero}>
        <div className={s.heroOverlay} />
        <div className={s.heroInner}>
          <div className={`${s.heroContent} animate-fade-up`}>
            <h1 className={s.heroTitle}>{heroTitle}</h1>
            <p className={s.heroSub}>{heroSubtitle}</p>
            <div className={s.heroActions}>
              <button type="button" className={s.btnGold} onClick={handleAiClick}>
                {user ? heroCta : (t.hero_cta_login || "Kirish va maslahat olish")}
              </button>
              <a
                href={telegramLink}
                target="_blank"
                rel="noreferrer"
                className={s.btnOutline}
              >
                ✈ {t.btn_telegram}
              </a>
            </div>
            {!user && (
              <p className={s.heroNote}>
                {t.hero_note}
              </p>
            )}
          </div>
        </div>
        <div className={s.featuresRow}>
          <div className={s.featuresInner}>
            {t.features.map((f, i) => (
              <div
                key={f.title}
                className={`${s.featureCard} animate-fade-up`}
                style={{ animationDelay: `${0.1 + i * 0.08}s` }}
                onClick={handleAiClick}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && handleAiClick()}
              >
                <span className={s.featureIcon}>{f.icon}</span>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className={s.statsSection}>
        <div className={s.container}>
          <div className={s.statsGrid}>
            {stats.map((stat, i) => (
              <div key={i} className={s.statCard}>
                <span className={s.statIcon}>{stat.icon}</span>
                <div className={s.statValue}>{stat.value}</div>
                <div className={s.statLabel}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className={s.categoriesSection}>
        <div className={s.container}>
          <h2 className={s.sectionTitle}>{t.section_cats_title}</h2>
          <div className={s.categoriesGrid}>
            {t.cats.map((cat, i) => (
              <div
                key={cat.title}
                className={s.categoryCard}
                onClick={handleAiClick}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && handleAiClick()}
              >
                <span className={s.categoryIcon}>{cat.icon}</span>
                <h3>{cat.title}</h3>
                <p>{cat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className={s.stepsSection}>
        <div className={s.container}>
          <h2 className={s.sectionTitle}>{t.section_steps_title}</h2>
          <div className={s.stepsGrid}>
            {t.steps.map((step, i) => (
              <div key={step.n} className={s.stepCard}>
                <div className={s.stepNumber}>{step.n}</div>
                <h3>{step.t}</h3>
                <p>{step.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={s.ctaSection}>
        <div className={s.container}>
          <div className={s.ctaCard}>
            <h2>{t.cta_title}</h2>
            <p>{t.cta_desc}</p>
            <button type="button" className={s.ctaButton} onClick={handleAiClick}>
              {t.cta_btn}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
