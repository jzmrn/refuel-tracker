import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  axisConfig,
  useGridConfig,
  useAxisColor,
  useChartKey,
} from "@/lib/chartConfig";
import { DetailAggregate, buildColorMap, ChartTooltip } from "./chartUtils";
import { useLocalization } from "@/lib/i18n/LanguageContext";

interface ChartEntry {
  date: string;
  [entity: string]: string | number | undefined;
}

type Direction = "increased" | "decreased";

interface PriceDirectionChartProps {
  data: DetailAggregate[];
  direction: Direction;
}

/**
 * Reusable chart component for displaying price increases or decreases per station day.
 * Used in detail pages for brands, places, and stations.
 */
export default function PriceDirectionChart({
  data,
  direction,
}: PriceDirectionChartProps) {
  const gridConfig = useGridConfig();
  const axisColor = useAxisColor();
  const { formatMonthLabel } = useLocalization();
  const chartKey = useChartKey(data);

  const { chartData, entities } = useMemo(() => {
    const monthSet = new Set<string>();
    const entitySet = new Set<string>();
    const byMonth = new Map<string, Record<string, number | undefined>>();

    for (const d of data) {
      const value =
        direction === "increased"
          ? d.price_increased_per_station_day
          : d.price_decreased_per_station_day;

      // Skip if value is null/undefined
      if (value == null) continue;

      monthSet.add(d.date);
      entitySet.add(d.entity);
      const entry = byMonth.get(d.date) ?? {};
      entry[d.entity] = value;
      byMonth.set(d.date, entry);
    }

    const months = Array.from(monthSet).sort();
    const entities = Array.from(entitySet);

    entities.sort();

    const chartData: ChartEntry[] = months.map((date) => ({
      date,
      ...(byMonth.get(date) ?? {}),
    }));

    return { chartData, entities };
  }, [data, direction]);

  const colorMap = useMemo(() => buildColorMap(entities), [entities]);

  if (chartData.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        key={chartKey}
        data={chartData}
        margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
      >
        <CartesianGrid {...gridConfig} />
        <XAxis
          dataKey="date"
          {...axisConfig.xAxis}
          stroke={axisColor}
          tickFormatter={formatMonthLabel}
        />
        <YAxis {...axisConfig.yAxis} stroke={axisColor} domain={[0, "auto"]} />
        <Tooltip
          content={
            <ChartTooltip
              labelFormatter={formatMonthLabel}
              isFuelPrice={false}
            />
          }
        />
        {entities.map((entity) => (
          <Line
            key={entity}
            type="monotone"
            dataKey={entity}
            stroke={colorMap.get(entity)}
            name={entity}
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/**
 * Check if all data points have price direction data available.
 * Returns true only if every item has both increased and decreased values.
 */
export function hasPriceDirectionData(data: DetailAggregate[]): boolean {
  if (data.length === 0) return false;
  return data.every(
    (d) =>
      d.price_increased_per_station_day != null &&
      d.price_decreased_per_station_day != null,
  );
}
