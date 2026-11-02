"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { HI } from "./hi";

export type Lang = "en" | "hi";

const I18nContext = createContext<{
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (text: string) => string;
}>({
  lang: "en",
  setLang: () => undefined,
  t: (text) => text,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem("erp-lang");
    if (stored === "hi" || stored === "en") setLangState(stored);
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    window.localStorage.setItem("erp-lang", next);
    document.documentElement.lang = next === "hi" ? "hi" : "en";
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === "hi" ? "hi" : "en";
  }, [lang]);

  const t = useCallback(
    (text: string) => (lang === "hi" ? (HI[text] ?? text) : text),
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang, t } = useI18n();
  return (
    <button
      type="button"
      onClick={() => setLang(lang === "en" ? "hi" : "en")}
      className={
        className ??
        "rounded-full border border-[var(--rule)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--green-dark)] shadow-[0_1px_0_rgba(0,0,0,0.02)]"
      }
      aria-label={lang === "en" ? "Switch to Hindi" : "Switch to English"}
    >
      {lang === "en" ? "हिन्दी" : t("English")}
    </button>
  );
}
