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
 * Creates an SVG tspan-based fuel price formatter for use in chart axis ticks.
 * The superscript is rendered smaller and raised using SVG tspan elements.
 *
 * @param price - The price to format
 * @param options - Options for dy offset and font size ratio
 * @returns SVG tspan elements or null if price is undefined
 */
export function renderSvgFuelPrice(
  price: number,
  options: {
    superscriptDy?: number;
    superscriptFontSize?: string;
    showCurrency?: boolean;
  } = {},
): React.ReactNode {
  const {
    superscriptDy = -3,
    superscriptFontSize = "0.8em",
    showCurrency = true,
  } = options;

  const parts = getFuelPriceParts(price);
  if (!parts) {
    return null;
  }

  return (
    <>
      <tspan>{parts.mainPart}</tspan>
      <tspan fontSize={superscriptFontSize} dy={superscriptDy}>
        {parts.superscript}
      </tspan>
      {showCurrency && <tspan dy={-superscriptDy}>€</tspan>}
    </>
  );
}
