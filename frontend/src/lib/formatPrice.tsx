import React from "react";

/**
 * Configuration for fuel price formatting
 */
export interface FuelPriceFormatOptions {
  /**
   * CSS class for the superscript element (the 3rd decimal digit)
   * Default: "text-[0.6em]"
   */
  superscriptClass?: string;
  /**
   * Whether to include the € suffix
   * Default: false
   */
  showCurrency?: boolean;
  /**
   * Additional suffix (e.g., "/L" for €/L)
   * Default: undefined
   */
  suffix?: string;
}

/**
 * Formats a fuel price with the last decimal digit as superscript.
 * In Germany, fuel prices are displayed with 3 decimal places,
 * where the third digit (1/10 of a cent) is shown smaller and raised.
 *
 * @param price - The price to format (e.g., 1.569)
 * @param options - Formatting options
 * @returns A React element with formatted price, or "-" if price is undefined/null
 *
 * @example
 * // Basic usage
 * formatFuelPrice(1.569)
 * // => "1.56" with superscript "9"
 *
 * @example
 * // With currency
 * formatFuelPrice(1.569, { showCurrency: true })
 * // => "1.56" with superscript "9" followed by "€"
 *
 * @example
 * // With larger superscript for bigger text
 * formatFuelPrice(1.569, { superscriptClass: "text-lg" })
 */
export function formatFuelPrice(
  price?: number | null,
  options: FuelPriceFormatOptions = {},
): React.ReactNode {
  const {
    superscriptClass = "text-[0.6em]",
    showCurrency = false,
    suffix,
  } = options;

  if (price === undefined || price === null) {
    return "-";
  }

  const priceStr = price.toFixed(3);
  const mainPart = priceStr.slice(0, -1); // e.g., "1.56"
  const superscript = priceStr.slice(-1); // e.g., "9"

  return (
    <span className="inline-flex items-start">
      <span>{mainPart}</span>
      <span className={`${superscriptClass} leading-none`}>{superscript}</span>
      {showCurrency && <span>€</span>}
      {suffix && <span>{suffix}</span>}
    </span>
  );
}

/**
 * Returns the formatted parts of a fuel price without rendering.
 * Useful for SVG rendering or when you need custom rendering logic.
 *
 * @param price - The price to format
 * @returns An object with mainPart and superscript, or null if price is undefined/null
 */
export function getFuelPriceParts(
  price?: number | null,
): { mainPart: string; superscript: string } | null {
  if (price === undefined || price === null) {
    return null;
  }

  const priceStr = price.toFixed(3);
  return {
    mainPart: priceStr.slice(0, -1),
    superscript: priceStr.slice(-1),
  };
}

/**
 * Formats a fuel price as a plain string (without superscript styling).
 * Useful for tooltips, charts, or contexts where React elements can't be used.
 *
 * @param price - The price to format
 * @param options - Options for currency display
 * @returns A formatted string like "1.569€" or "1.569"
 */
export function formatFuelPriceString(
  price?: number | null,
  options: { showCurrency?: boolean; suffix?: string } = {},
): string {
  const { showCurrency = false, suffix = "" } = options;

  if (price === undefined || price === null) {
    return "-";
  }

  return `${price.toFixed(3)}${showCurrency ? "€" : ""}${suffix}`;
}

/**
 * Formats a fuel price as a plain string for SVG/chart axis ticks.
 * Uses Unicode superscript digits for the last decimal place.
 *
 * @param price - The price to format
 * @param options - Options for currency display
 * @returns A formatted string like "1.56⁹€" or "1.56⁹"
 */
export function renderSvgFuelPrice(
  price: number | undefined | null,
  options: {
    showCurrency?: boolean;
  } = {},
): string {
  const { showCurrency = true } = options;

  if (price === undefined || price === null) {
    return "-";
  }

  const parts = getFuelPriceParts(price);
  if (!parts) {
    return "-";
  }

  // Unicode superscript digits: ⁰¹²³⁴⁵⁶⁷⁸⁹
  const superscriptDigits = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];
  const superscript =
    superscriptDigits[parseInt(parts.superscript, 10)] || parts.superscript;

  return `${parts.mainPart}${superscript}${showCurrency ? " €" : ""}`;
}
