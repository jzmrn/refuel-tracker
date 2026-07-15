import React from "react";
import { TooltipProps } from "recharts";
import {
  chartClassNames,
  customTooltipContainerStyle,
} from "@/lib/chartConfig";
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
  price_increased_per_station_day?: number | null;
  price_decreased_per_station_day?: number | null;
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
              {entry.strokeDasharray ? (
                <svg width="12" height="10" className="shrink-0">
                  <line
                    x1="0"
                    y1="5"
                    x2="12"
                    y2="5"
                    stroke={entry.color}
                    strokeWidth="2"
                    strokeDasharray={entry.strokeDasharray}
                  />
                </svg>
              ) : (
                <span
                  className="inline-block w-3 h-0.5 shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
              )}
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
  colorMap?: Map<string, string>;
  /** Overlay entities rendered with a dashed swatch, placed first in the legend */
  overlayEntities?: Set<string>;
}

/**
 * Unified chart legend. Overlay (average) entities are shown first with a
 * dashed line swatch; regular entities follow with a solid line swatch.
 */
export function ChartLegend({
  data,
  colorMap: externalColorMap,
  overlayEntities,
}: ChartLegendProps) {
  const allEntities = Array.from(new Set(data.map((d) => d.entity))).sort();
  const colorMap = externalColorMap ?? buildColorMap(allEntities);

  const overlays = overlayEntities
    ? allEntities.filter((e) => overlayEntities.has(e))
    : [];
  const regular = overlayEntities
    ? allEntities.filter((e) => !overlayEntities.has(e))
    : allEntities;

  if (allEntities.length === 0) return null;

  return (
    <div className={chartClassNames.legendContainer}>
      {overlays.map((entity) => {
        const color = colorMap.get(entity) ?? "#888";
        return (
          <div key={entity} className={chartClassNames.legendItem}>
            <svg width="20" height="10" className="shrink-0">
              <line
                x1="0"
                y1="5"
                x2="20"
                y2="5"
                stroke={color}
                strokeWidth="3"
                strokeDasharray="4 2"
              />
            </svg>
            <span className={chartClassNames.legendText}>{entity}</span>
          </div>
        );
      })}
      {regular.map((entity) => (
        <div key={entity} className={chartClassNames.legendItem}>
          <span
            className={chartClassNames.legendLine}
            style={{ backgroundColor: colorMap.get(entity) }}
          />
          <span className={chartClassNames.legendText}>{entity}</span>
        </div>
      ))}
    </div>
  );
}

interface InteractiveLegendProps {
  /** All entities available in the data set */
  entities: string[];
  /** Currently enabled/visible entities */
  enabledEntities: Set<string>;
  /** Called when user toggles an entity */
  onToggle: (entity: string) => void;
}

/**
 * Interactive legend where each entity is a clickable pill.
 * Enabled items show a colored background; disabled items are muted.
 */
export function InteractiveLegend({
  entities,
  enabledEntities,
  onToggle,
}: InteractiveLegendProps) {
  const sorted = [...entities].sort();
  const colorMap = buildColorMap(sorted);

  return (
    <div className="flex flex-wrap justify-center gap-2 px-3 py-2">
      {sorted.map((entity) => {
        const color = colorMap.get(entity)!;
        const enabled = enabledEntities.has(entity);

        return (
          <button
            key={entity}
            type="button"
            onClick={() => onToggle(entity)}
            className={`
              inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm
              transition-all duration-150 cursor-pointer select-none
              border
              ${
                enabled
                  ? "border-transparent shadow-sm font-medium"
                  : "border-gray-300 dark:border-gray-600 opacity-50 hover:opacity-75"
              }
            `}
            style={
              enabled
                ? {
                    backgroundColor: color + "20",
                    color,
                    borderColor: color + "60",
                  }
                : undefined
            }
          >
            <span
              className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: enabled ? color : "#9ca3af" }}
            />
            <span className={enabled ? "" : "text-secondary"}>{entity}</span>
          </button>
        );
      })}
    </div>
  );
}
