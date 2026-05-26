import React from "react";
import { useChatPanel } from "../context/ChatPanelContext";
import { useLang } from "../context/LangContext";
import s from "./FloatingConsultButton.module.css";
import favicon from "../../public/favicon.png"

export default function FloatingConsultButton() {
  const { isOpen, openChat } = useChatPanel();
  const { t } = useLang();

  if (isOpen) return null;

  return (
    <button
      type="button"
      className={s.fab}
      onClick={openChat}
      aria-label={t.nav_consult_free}
      title={t.nav_consult_free}
    >
      <span className={s.fabPulse} aria-hidden="true" />
      <span className={s.fabIcon}>
        <img width={60} src={favicon} alt="" />
      </span>
      <span className={s.fabText}>{t.nav_consult_free}</span>
    </button>
  );
}
