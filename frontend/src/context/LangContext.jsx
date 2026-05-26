import React, { createContext, useContext, useState } from "react";
import { translations, defaultLang } from "../i18n/translations";

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem("lang") || defaultLang;
  });

  function changeLang(l) {
    setLang(l);
    localStorage.setItem("lang", l);
  }

  const t = translations[lang] || translations[defaultLang];

  return (
    <LangContext.Provider value={{ lang, changeLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
