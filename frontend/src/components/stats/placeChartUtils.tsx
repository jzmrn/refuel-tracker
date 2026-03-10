import React from "react";
import { TooltipProps } from "recharts";
import { tooltipStyle } from "@/lib/chartConfig";

const PLACE_COLORS = [
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

/**
 * Build a deterministic color map for places.
 * Colors are assigned based on alphabetical order so the same place
 * always gets the same color across all charts.
 */
export function buildPlaceColorMap(places: string[]): Map<string, string> {
  const sorted = [...places].sort();
  return new Map(
    sorted.map((p, i) => [p, PLACE_COLORS[i % PLACE_COLORS.length]]),
  );
}

interface PlaceTooltipProps extends TooltipProps<number, string> {
  labelFormatter?: (label: string) => string;
  valueFormatter: (value: number) => string;
}

export function PlaceTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
}: PlaceTooltipProps) {
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
