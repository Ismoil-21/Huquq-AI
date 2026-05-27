import React, { useState, useRef, useEffect } from "react";
import { useLang } from "../context/LangContext";
import { Check } from "lucide-react";
import s from "./LangSwitcher.module.css";

const LANGS = [
  { code: "uz", flag: "🇺🇿", name: "O'zbek", short: "UZ" },
  { code: "ru", flag: "🇷🇺", name: "Русский", short: "RU" },
  { code: "en", flag: "🇬🇧", name: "English", short: "EN" },
];

export default function LangSwitcher({ dark = false, compact = false, dropUp = false, className = "" }) {
  const { lang, changeLang } = useLang();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const current = LANGS.find((l) => l.code === lang) || LANGS[0];

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function handleKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  function select(code) {
    changeLang(code);
    setOpen(false);
  }

  return (
    <div
      ref={wrapRef}
      className={`${s.wrap} ${dark ? s.dark : ""} ${compact ? s.compact : ""} ${dropUp ? s.dropUp : ""} ${open ? s.open : ""} ${className}`}
    >
      <button
        type="button"
        className={s.trigger}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Language"
      >
        <span className={s.triggerFlag}>{current.flag}</span>
        <span className={s.triggerLabel}>{compact ? current.short : current.name}</span>
        <span className={s.chevron} aria-hidden="true" />
      </button>

      {open && (
        <ul className={s.dropdown} role="listbox">
            {LANGS.map((l, i) => (
              <li key={l.code} role="option" aria-selected={lang === l.code}>
                <button
                  type="button"
                  className={`${s.option} ${lang === l.code ? s.optionActive : ""} animate-fade-up`}
                  style={{ animationDelay: `${i * 0.05}s` }}
                  onClick={() => select(l.code)}
                >
                  <span className={s.optionFlag}>{l.flag}</span>
                  <span className={s.optionName}>{l.name}</span>
                  {lang === l.code && <Check size={14} className={s.check} />}
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
