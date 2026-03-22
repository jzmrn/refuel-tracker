export const FILTER_COOKIE_PREFIX = "refuel-filter-";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Parse all filter collapse cookies from a cookie header string. */
export function parseFilterCookies(
  cookieString: string | undefined,
): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  if (!cookieString) return result;

  cookieString
    .split(";")
    .map((c) => c.trim())
    .filter((c) => c.startsWith(FILTER_COOKIE_PREFIX))
    .forEach((c) => {
      const [name, value] = c.split("=");
      const key = name.slice(FILTER_COOKIE_PREFIX.length);
      if (value === "0") result[key] = false;
      else if (value === "1") result[key] = true;
    });

  return result;
}

/** Set a single filter collapse cookie (client-side). */
export function setFilterCookie(key: string, collapsed: boolean): void {
  document.cookie = `${FILTER_COOKIE_PREFIX}${key}=${collapsed ? "1" : "0"};path=/;max-age=${COOKIE_MAX_AGE};SameSite=Lax`;
}
