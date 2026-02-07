import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Language, TranslationStructure } from "./types";
import {
  getTranslations,
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
} from "./index";

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
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);
  const [translations, setTranslations] = useState<TranslationStructure>(
    getTranslations(DEFAULT_LANGUAGE),
  );

  // Load language from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedLanguage = localStorage.getItem(STORAGE_KEY) as Language;
      if (
        storedLanguage &&
        SUPPORTED_LANGUAGES.some((lang) => lang.code === storedLanguage)
      ) {
        setLanguageState(storedLanguage);
        setTranslations(getTranslations(storedLanguage));
      } else {
        // Detect browser language
        const browserLanguage = navigator.language.split("-")[0] as Language;
        if (SUPPORTED_LANGUAGES.some((lang) => lang.code === browserLanguage)) {
          setLanguageState(browserLanguage);
          setTranslations(getTranslations(browserLanguage));
        }
      }
    }
  }, []);

  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage);
    setTranslations(getTranslations(newLanguage));

    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, newLanguage);
    }
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

  return {
    language,
    formatDate,
    formatNumber,
  };
}
