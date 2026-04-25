import React from "react";
import { TooltipProps } from "recharts";
import { customTooltipContainerStyle } from "@/lib/chartConfig";
import { renderSvgFuelPrice } from "@/lib/formatPrice";
import { useLocalization, useTranslation } from "@/lib/i18n/LanguageContext";

/** Consistent chart height across all stats charts */
export const CHART_HEIGHT = "h-72 sm:h-64";

/**
 * No-data fallback component for charts.
 * Maintains the same height as the chart would have.
 */
export function ChartNoData() {
  const { t } = useTranslation();
  return (
    <div className={`flex items-center justify-center ${CHART_HEIGHT}`}>
      <span className="text-secondary">{t.fuelPrices.noDataAvailable}</span>
    </div>
  );
}

/**
 * Hook providing date formatters for chart axes and tooltips.
 * @returns formatAxisDate - short format for axis labels (e.g., "24.04")
 * @returns formatTooltipDate - full format for tooltips (e.g., "Thursday, 24. April 2026")
 */
export function useChartDateFormatters() {
  const { formatDate } = useLocalization();

  const formatAxisDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return formatDate(date, { day: "2-digit", month: "2-digit" });
  };

  const formatTooltipDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return formatDate(date, {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  return { formatAxisDate, formatTooltipDate };
}

const CHART_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
  "#84cc16",
  "#06b6d4",
  "#e11d48",
];

// Alternate color palette for comparison charts (distinct from CHART_COLORS)
const COMPARISON_CHART_COLORS = [
  "#dc2626", // red-600
  "#7c3aed", // violet-600
  "#0891b2", // cyan-600
  "#ca8a04", // yellow-600
  "#16a34a", // green-600
  "#db2777", // pink-600
  "#2563eb", // blue-600
  "#ea580c", // orange-600
];

export interface DetailAggregate {
  date: string;
  entity: string;
  price_mean: number;
  price_min: number;
  price_max: number;
  price_std: number | null;
  n_stations: number;
  n_price_changes: number;
  n_unique_prices: number;
  n_days: number;
  price_changes_per_station_day: number;
  unique_prices_per_station_day: number;
}

/**
 * Build a deterministic color map for entities.
 * Colors are assigned based on alphabetical order so the same entity
 * always gets the same color across all charts.
 */
export function buildColorMap(entities: string[]): Map<string, string> {
  const sorted = [...entities].sort();
  return new Map(
    sorted.map((p, i) => [p, CHART_COLORS[i % CHART_COLORS.length]]),
  );
}

/**
 * Build a color map using the comparison palette (distinct from main charts).
 * Use this for comparison charts to avoid color collisions.
 */
export function buildComparisonColorMap(
  entities: string[],
): Map<string, string> {
  const sorted = [...entities].sort();
  return new Map(
    sorted.map((p, i) => [
      p,
      COMPARISON_CHART_COLORS[i % COMPARISON_CHART_COLORS.length],
    ]),
  );
}

/** Fixed color assignments for comparison chart types */
export const COMPARISON_TYPE_COLORS: Record<string, string> = {
  station: "#dc2626", // red-600
  place: "#7c3aed", // violet-600
  brand: "#0891b2", // cyan-600
};

interface ChartTooltipProps extends TooltipProps<number, string> {
  /** Formatter for the date/label shown at the top of the tooltip */
  labelFormatter?: (label: string) => string;
  /** Whether values represent fuel prices (will use renderSvgFuelPrice) */
  isFuelPrice?: boolean;
}

export function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  isFuelPrice = true,
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  const sorted = [...payload]
    .filter((entry) => entry.value != null)
    .sort((a, b) => (b.value as number) - (a.value as number));

  const formatValue = (value: number) => {
    if (isFuelPrice) return renderSvgFuelPrice(value);
    else return value.toFixed(2);
  };

  return (
    <div
      className="p-3 rounded-lg shadow-lg"
      style={customTooltipContainerStyle}
    >
      <p className="text-gray-300 text-sm mb-2">
        {labelFormatter ? labelFormatter(String(label)) : label}
      </p>
      <div className="space-y-1 text-sm">
        {sorted.map((entry) => (
          <p
            key={entry.name}
            className="flex justify-between items-center gap-4"
          >
            <span className="flex items-center gap-1.5 text-gray-400">
              <span
                className="inline-block w-3 h-0.5 shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name}
            </span>
            <span className="font-semibold" style={{ color: entry.color }}>
              {formatValue(entry.value as number)}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}

interface ChartLegendProps {
  data: DetailAggregate[];
}

export function ChartLegend({ data }: ChartLegendProps) {
  const entities = Array.from(new Set(data.map((d) => d.entity))).sort();
  const colorMap = buildColorMap(entities);

  return (
    <div className="flex flex-wrap justify-center gap-x-5 gap-y-1.5 px-3 py-2">
      {entities.map((entity) => (
        <div key={entity} className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-0.5 shrink-0"
            style={{ backgroundColor: colorMap.get(entity) }}
          />
          <span className="text-sm text-secondary">{entity}</span>
        </div>
      ))}
    </div>
  );
}
