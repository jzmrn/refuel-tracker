import { Language, isLanguage } from "./types";
import { DEFAULT_LANGUAGE } from "./index";

export const LANGUAGE_COOKIE_KEY = "refuel-tracker-language";

/** Set language cookie (client-side). Max-age 1 year, SameSite=Lax. */
export function setLanguageCookie(language: Language): void {
  document.cookie = `${LANGUAGE_COOKIE_KEY}=${language};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
}

/** Parse language from a cookie header string (works on both client and server). */
export function parseLanguageCookie(
  cookieString: string | undefined,
): Language {
  if (!cookieString) return DEFAULT_LANGUAGE;

  const match = cookieString
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${LANGUAGE_COOKIE_KEY}=`));

  if (!match) return DEFAULT_LANGUAGE;

  const value = match.split("=")[1];
  return isLanguage(value) ? value : DEFAULT_LANGUAGE;
}
