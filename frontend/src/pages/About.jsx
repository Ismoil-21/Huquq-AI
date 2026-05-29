import React, { useEffect, useState } from "react";
import { useLang } from "../context/LangContext";
import { Calendar, Check, Smile } from "lucide-react";
import shared from "../styles/site.module.css";
import s from "./About.module.css";

const LAWS = [
  { code: "laws_labor", items: "laws_labor_items" },
  { code: "laws_family", items: "laws_family_items" },
  { code: "laws_civil", items: "laws_civil_items" },
  { code: "laws_land", items: "laws_land_items" },
  { code: "laws_criminal", items: "laws_criminal_items" },
  { code: "laws_consumer", items: "laws_consumer_items" },
];

export default function About() {
  const { t } = useLang();
  const [siteContent, setSiteContent] = useState(null);

  useEffect(() => {
    const fetchSiteContent = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/site/content`);
        const data = await response.json();
        setSiteContent(data);
      } catch (error) {
        console.error("Error fetching site content:", error);
      }
    };

    fetchSiteContent();
  }, []);

  // Matnlar har doim t.* dan (til bilan o'zgaradi)
  const aboutTitle = t.about_title;
  const aboutLead  = t.about_lead;
  const aboutText  = t.about_text;

  // Stats: raqamlar backend'dan, labellar t.* dan
  const stats = siteContent?.stats ? [
    { icon: <Calendar size={24} />, value: siteContent.stats.experience, label: t.stats[0]?.label },
    { icon: <Check size={24} />,    value: siteContent.stats.cases,      label: t.stats[1]?.label },
    { icon: <Smile size={24} />,    value: siteContent.stats.clients,    label: t.stats[2]?.label },
  ] : t.stats;

  return (
    <>
      <div className={`${shared.pageHero} animate-fade-up`}>
        <div className={shared.container}>
          <h1 className={shared.pageHeroTitle}>{aboutTitle}</h1>
          <p className={shared.pageHeroSub}>{aboutLead}</p>
        </div>
      </div>

      <section className={`${shared.pageSection} animate-fade-up`}>
        <div className={shared.container}>
          <div className={s.aboutGrid}>
            <div>
              <p className={s.aboutDesc}>{aboutText}</p>
              <div className={s.stats}>
                {stats.map((st) => (
                  <div key={st.label} className={s.stat}>
                    <span className={s.statIcon}>{st.icon}</span>
                    <div>
                      <strong>{st.value}</strong>
                      <span>{st.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className={s.aboutImage}>
              <div className={s.aboutImgPlaceholder}>
                <span>⚖</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={shared.pageSectionAlt}>
        <div className={shared.container}>
          <div className={shared.sHead}>
            <h2 className={shared.sTitle}>{t.about_laws_title}</h2>
            <div className={shared.sLine} />
          </div>
          <div className={s.lawGrid}>
            {LAWS.map((l) => (
              <div key={l.code} className={s.lawCard}>
                <h3 className={s.lawTitle}>{t[l.code]}</h3>
                <ul className={s.lawList}>
                  {t[l.items].map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className={s.warn}>{t.about_warn}</div>
        </div>
      </section>
    </>
  );
}