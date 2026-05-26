import React from "react";
import { useChatPanel } from "../context/ChatPanelContext";
import { useLang } from "../context/LangContext";
import shared from "../styles/site.module.css";
import s from "./Articles.module.css";

const THUMBS = ["📋", "📜", "🛒"];

export default function Articles() {
  const { openChat } = useChatPanel();
  const { t } = useLang();

  return (
    <>
      <div className={`${shared.pageHero} animate-fade-up`}>
        <div className={shared.container}>
          <h1 className={shared.pageHeroTitle}>{t.articles_title}</h1>
          <p className={shared.pageHeroSub}>{t.footer_desc}</p>
        </div>
      </div>

      <section className={shared.pageSection}>
        <div className={shared.container}>
          <div className={s.articleList}>
            {t.articles.map((a, i) => (
              <article key={a.title} className={`${s.articleItem} animate-fade-up`} style={{ animationDelay: `${i * 0.08}s` }}>
                <div className={s.articleThumb}>
                  <span>{THUMBS[i]}</span>
                </div>
                <div className={s.articleBody}>
                  <time className={s.articleDate}>{a.date}</time>
                  <h2>{a.title}</h2>
                  <p>{a.excerpt}</p>
                </div>
              </article>
            ))}
          </div>
          <div className={s.ctaWrap}>
            <button type="button" className={shared.btnGold} onClick={openChat}>
              {t.articles_btn}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
