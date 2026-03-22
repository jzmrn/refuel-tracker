import type { FuelType } from "@/lib/api";

export const FUEL_TYPE_COOKIE_KEY = "refuel-tracker-fuel-type";

const VALID_FUEL_TYPES: ReadonlySet<string> = new Set(["e5", "e10", "diesel"]);

const DEFAULT_FUEL_TYPE: FuelType = "e5";

/** Set fuel type cookie (client-side). Max-age 1 year, SameSite=Lax. */
export function setFuelTypeCookie(fuelType: FuelType): void {
  document.cookie = `${FUEL_TYPE_COOKIE_KEY}=${fuelType};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
}

/** Parse fuel type from a cookie header string (works on both client and server). */
export function parseFuelTypeCookie(
  cookieString: string | undefined,
): FuelType {
  if (!cookieString) return DEFAULT_FUEL_TYPE;

  const match = cookieString
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${FUEL_TYPE_COOKIE_KEY}=`));

  if (!match) return DEFAULT_FUEL_TYPE;

  const value = match.split("=")[1];
  return VALID_FUEL_TYPES.has(value) ? (value as FuelType) : DEFAULT_FUEL_TYPE;
}
