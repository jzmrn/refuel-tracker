import React from "react";
import { TooltipProps } from "recharts";
import { tooltipStyle } from "@/lib/chartConfig";

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

interface ChartTooltipProps extends TooltipProps<number, string> {
  labelFormatter?: (label: string) => string;
  valueFormatter: (value: number) => string;
}

export function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  const sorted = [...payload]
    .filter((entry) => entry.value != null)
    .sort((a, b) => (b.value as number) - (a.value as number));

  return (
    <div
      style={{
        ...tooltipStyle.contentStyle,
        padding: "8px 12px",
      }}
    >
      <p style={{ margin: "0 0 4px 0", fontWeight: 600 }}>
        {labelFormatter ? labelFormatter(String(label)) : label}
      </p>
      {sorted.map((entry) => (
        <div
          key={entry.name}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "16px",
            padding: "1px 0",
          }}
        >
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span
            style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}
          >
            {valueFormatter(entry.value as number)}
          </span>
        </div>
      ))}
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
            className="inline-block w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: colorMap.get(entity) }}
          />
          <span className="text-sm text-secondary">{entity}</span>
        </div>
      ))}
    </div>
  );
}
