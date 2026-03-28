import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  startTransition,
} from "react";
import { Language, TranslationStructure, isLanguage } from "./types";
import {
  getTranslations,
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
} from "./index";
import {
  setLanguageCookie,
  LANGUAGE_COOKIE_KEY,
  parseLanguageCookie,
} from "./cookies";

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: TranslationStructure;
  supportedLanguages: typeof SUPPORTED_LANGUAGES;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

const STORAGE_KEY = "refuel-tracker-language";

interface LanguageProviderProps {
  children: ReactNode;
  initialLanguage?: Language;
}

export function LanguageProvider({
  children,
  initialLanguage,
}: LanguageProviderProps) {
  const initial = initialLanguage ?? DEFAULT_LANGUAGE;
  const [language, setLanguageState] = useState<Language>(initial);
  const [translations, setTranslations] = useState<TranslationStructure>(() =>
    getTranslations(initial),
  );

  // On mount: resolve language from cookie or localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const fromCookie = parseLanguageCookie(document.cookie);

    // localStorage wins over cookie (migration path), cookie wins over default
    const resolved = stored && isLanguage(stored) ? stored : fromCookie;

    // Sync cookie if needed
    if (
      stored &&
      isLanguage(stored) &&
      !document.cookie.includes(LANGUAGE_COOKIE_KEY)
    ) {
      setLanguageCookie(stored);
    }

    if (resolved !== language) {
      startTransition(() => {
        setLanguageState(resolved);
        setTranslations(getTranslations(resolved));
      });
    }
  }, []);

  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage);
    setTranslations(getTranslations(newLanguage));
    setLanguageCookie(newLanguage);
    localStorage.setItem(STORAGE_KEY, newLanguage);
  };

  const value = {
    language,
    setLanguage,
    t: translations,
    supportedLanguages: SUPPORTED_LANGUAGES,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return context;
}

// Hook for localized formatting
export function useLocalization() {
  const { language } = useTranslation();

  const formatDate = (date: Date, options?: Intl.DateTimeFormatOptions) => {
    const locale = language === "de" ? "de-DE" : "en-US";
    return new Intl.DateTimeFormat(locale, options).format(date);
  };

  const formatNumber = (number: number, options?: Intl.NumberFormatOptions) => {
    const locale = language === "de" ? "de-DE" : "en-US";
    return new Intl.NumberFormat(locale, options).format(number);
  };

  const formatMonthLabel = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return formatDate(date, { month: "long", year: "numeric" });
  };

  const formatTimestamp = (ts: string) => {
    const date = new Date(ts);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();
    return isToday
      ? formatDate(date, { hour: "2-digit", minute: "2-digit" })
      : formatDate(date, {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });
  };

  return {
    language,
    formatDate,
    formatNumber,
    formatMonthLabel,
    formatTimestamp,
  };
}
