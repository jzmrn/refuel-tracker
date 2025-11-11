import { Language } from "./types";

// Locale mapping for date-fns and Intl
export const LOCALE_MAPPING: Record<Language, string> = {
  en: "en-US",
  de: "de-DE",
};

// Get locale string for the current language
export function getLocale(language: Language): string {
  return LOCALE_MAPPING[language] || LOCALE_MAPPING.en;
}

// Format date with locale support
export function formatDate(
  date: Date,
  language: Language,
  options?: Intl.DateTimeFormatOptions
): string {
  const locale = getLocale(language);
  return new Intl.DateTimeFormat(locale, options).format(date);
}

// Format number with locale support
export function formatNumber(
  number: number,
  language: Language,
  options?: Intl.NumberFormatOptions
): string {
  const locale = getLocale(language);
  return new Intl.NumberFormat(locale, options).format(number);
}
