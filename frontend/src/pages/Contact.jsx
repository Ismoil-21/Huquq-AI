import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useChatPanel } from "../context/ChatPanelContext";
import { useLang } from "../context/LangContext";
import shared from "../styles/site.module.css";
import s from "./Contact.module.css";

export default function Contact() {
  const { openChat } = useChatPanel();
  const { user } = useAuth();
  const { t } = useLang();
  const [siteContent, setSiteContent] = useState(null);

  useEffect(() => {
    const fetchSiteContent = async () => {
      try {
        const response = await fetch("/api/site/content");
        const data = await response.json();
        setSiteContent(data);
      } catch (error) {
        console.error("Error fetching site content:", error);
      }
    };

    fetchSiteContent();
  }, []);

  // Use backend content if available, otherwise fallback to translations
  const address = siteContent?.contact?.address || t.contact_address;
  const phone = siteContent?.contact?.phone || t.contact_phone;
  const email = siteContent?.contact?.email || t.contact_email;
  const hoursWeek = siteContent?.contact?.hoursWeek || t.contact_hours_week;
  const hoursSat = siteContent?.contact?.hoursSat || t.contact_hours_sat;
  const telegramLink = siteContent?.social?.telegram || "https://t.me/MeningHuquqimBot";

  return (
    <>
      <div className={`${shared.pageHero} animate-fade-up`}>
        <div className={shared.container}>
          <h1 className={shared.pageHeroTitle}>{t.contact_title}</h1>
          <p className={shared.pageHeroSub}>{t.hero_subtitle}</p>
        </div>
      </div>

      <section className={shared.pageSection}>
        <div className={shared.container}>
          <div className={`${s.contactGrid} animate-fade-up`} style={{ animationDelay: "0.1s" }}>
            <ul className={s.contactList}>
              <li>
                <span className={s.contactIcon}>📍</span>
                <div>
                  <strong>{t.nav_contact}</strong>
                  <p>{address}</p>
                </div>
              </li>
              <li>
                <span className={s.contactIcon}>📞</span>
                <div>
                  <strong>{t.contact_phone}</strong>
                  <p>{phone}</p>
                </div>
              </li>
              <li>
                <span className={s.contactIcon}>✉️</span>
                <div>
                  <strong>{t.contact_email}</strong>
                  <p>{email}</p>
                </div>
              </li>
              <li>
                <span className={s.contactIcon}>🕐</span>
                <div>
                  <p>{hoursWeek}</p>
                  <p>{hoursSat}</p>
                </div>
              </li>
            </ul>

            <div className={s.contactCard}>
              <h2>{t.nav_consult_free}</h2>
              <p>{t.cta_desc}</p>
              <div className={s.contactActions}>
                <button type="button" className={shared.btnGold} onClick={openChat}>
                  {t.hero_cta}
                </button>
                <a
                  href={telegramLink}
                  target="_blank"
                  rel="noreferrer"
                  className={s.telegramLink}
                >
                  ✈ {t.btn_telegram}
                </a>
                {!user && (
                  <Link to="/login" className={s.linkLogin}>
                    {t.nav_login}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
