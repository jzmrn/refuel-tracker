import type { Theme } from "./ThemeContext";

export const THEME_COOKIE_KEY = "refuel-tracker-theme";

const VALID_THEMES: ReadonlySet<string> = new Set(["light", "dark", "system"]);

/** Set theme cookie (client-side). Max-age 1 year, SameSite=Lax. */
export function setThemeCookie(theme: Theme): void {
  document.cookie = `${THEME_COOKIE_KEY}=${theme};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
}

/** Parse theme from a cookie header string (works on both client and server). */
export function parseThemeCookie(cookieString: string | undefined): Theme {
  if (!cookieString) return "system";

  const match = cookieString
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${THEME_COOKIE_KEY}=`));

  if (!match) return "system";

  const value = match.split("=")[1];
  return VALID_THEMES.has(value) ? (value as Theme) : "system";
}
