import React from "react";
import { useChatPanel } from "../context/ChatPanelContext";
import { useLang } from "../context/LangContext";
import shared from "../styles/site.module.css";
import s from "./Services.module.css";

export default function Services() {
  const { openChat } = useChatPanel();
  const { t } = useLang();

  return (
    <>
      <div className={`${shared.pageHero} animate-fade-up`}>
        <div className={shared.container}>
          <h1 className={shared.pageHeroTitle}>{t.services_title}</h1>
          <p className={shared.pageHeroSub}>{t.hero_subtitle}</p>
        </div>
      </div>

      <section className={shared.pageSection}>
        <div className={shared.container}>
          <div className={s.servicesGrid}>
            {t.services.map((svc, i) => (
              <div
                key={svc.title}
                className={`${s.serviceCard} animate-fade-up`}
                style={{ animationDelay: `${i * 0.06}s` }}
                onClick={openChat}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && openChat()}
              >
                <span className={s.serviceIcon}>{svc.icon}</span>
                <h3>{svc.title}</h3>
                <p>{svc.desc}</p>
              </div>
            ))}
          </div>
          <div className={s.ctaWrap}>
            <button type="button" className={shared.btnGold} onClick={openChat}>
              {t.nav_consult_free}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
