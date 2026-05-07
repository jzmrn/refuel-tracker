import type { FuelType } from "@/lib/api";
import type { TranslationStructure } from "@/lib/i18n/types";

/**
 * Get the translated label for a fuel type.
 * Returns the fuel type string as-is if no translation is found.
 */
export function getFuelTypeLabel(
  fuelType: string | undefined,
  t: TranslationStructure,
  short: boolean = false,
): string {
  if (!fuelType) return "";

  const labels: Record<FuelType, string> = {
    e5: short ? t.fuelPrices.e5Short : t.fuelPrices.e5,
    e10: short ? t.fuelPrices.e10Short : t.fuelPrices.e10,
    diesel: t.fuelPrices.diesel,
  };

  return labels[fuelType as FuelType] ?? fuelType;
}

/**
 * Get all fuel type labels as a record.
 */
export function getFuelTypeLabels(
  t: TranslationStructure,
  short: boolean = false,
): Record<FuelType, string> {
  return {
    e5: short ? t.fuelPrices.e5Short : t.fuelPrices.e5,
    e10: short ? t.fuelPrices.e10Short : t.fuelPrices.e10,
    diesel: t.fuelPrices.diesel,
  };
}
