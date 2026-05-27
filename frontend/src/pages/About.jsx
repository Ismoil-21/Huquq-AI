import React, { useEffect, useState } from "react";
import { useLang } from "../context/LangContext";
import { Calendar, Check, Smile } from "lucide-react";
import shared from "../styles/site.module.css";
import s from "./About.module.css";

const LAWS = [
  { code: "Mehnat Kodeksi", items: ["Ish haqi (100-102)", "Bo'shatish (154-157)", "Ta'til (182)", "Nizolar (220)"] },
  { code: "Oila Kodeksi", items: ["Aliment (99-110)", "Ajralish (37-40)", "Bola egaligi (73)"] },
  { code: "Fuqarolik Kodeksi", items: ["Meros (1135-1260)", "Mulk huquqi", "Vasiyatnoma (1151)"] },
  { code: "Yer Kodeksi", items: ["Egalik turlari (16)", "Ijara (28)", "Tortib olish (34)"] },
  { code: "Jinoyat Kodeksi", items: ["Firibgarlik (168)", "Korrupsiya (210-212)", "Zo'ravonlik (110)"] },
  { code: "Iste'molchi Huquqlari", items: ["Qaytarish (14-m)", "Kafolat (19-m)", "Xizmat nuqsoni (16)"] },
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

  // Use backend content if available, otherwise fallback to translations
  const aboutTitle = siteContent?.about?.title || t.about_title;
  const aboutLead = siteContent?.about?.lead || t.about_lead;
  const aboutText = siteContent?.about?.text || t.about_text;
  
  const stats = siteContent?.stats ? [
    { icon: <Calendar size={24} />, value: siteContent.stats.experience, label: siteContent.stats.experienceLabel },
    { icon: <Check size={24} />, value: siteContent.stats.cases, label: siteContent.stats.casesLabel },
    { icon: <Smile size={24} />, value: siteContent.stats.clients, label: siteContent.stats.clientsLabel },
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
                <h3 className={s.lawTitle}>{l.code}</h3>
                <ul className={s.lawList}>
                  {l.items.map((i) => (
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
