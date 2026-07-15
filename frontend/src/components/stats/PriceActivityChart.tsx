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
import { DetailAggregate, ChartTooltip, ChartLegend } from "./chartUtils";
import { useLocalization } from "@/lib/i18n/LanguageContext";

interface ChartEntry {
  date: string;
  [entity: string]: string | number;
}

interface PriceActivityChartProps {
  data: DetailAggregate[];
  colorMap: Map<string, string>;
  overlayEntities?: Set<string>;
}

export default function PriceActivityChart({
  data,
  colorMap,
  overlayEntities,
}: PriceActivityChartProps) {
  const gridConfig = useGridConfig();
  const axisColor = useAxisColor();
  const { formatMonthLabel } = useLocalization();
  const chartKey = useChartKey(data);

  const { chartData, entities } = useMemo(() => {
    const monthSet = new Set<string>();
    const entitySet = new Set<string>();
    const byMonth = new Map<string, Record<string, number>>();

    for (const d of data) {
      monthSet.add(d.date);
      entitySet.add(d.entity);
      const entry = byMonth.get(d.date) ?? {};
      entry[d.entity] = d.price_changes_per_station_day;
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
  }, [data]);

  if (chartData.length === 0) return null;

  return (
    <>
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
          <YAxis
            {...axisConfig.yAxis}
            stroke={axisColor}
            domain={[0, "auto"]}
          />
          <Tooltip
            content={
              <ChartTooltip
                labelFormatter={formatMonthLabel}
                isFuelPrice={false}
              />
            }
          />
          {entities.map((entity) => {
            const isOverlay = overlayEntities?.has(entity);
            return (
              <Line
                key={entity}
                type="monotone"
                dataKey={entity}
                stroke={colorMap.get(entity)}
                name={entity}
                strokeWidth={isOverlay ? 3 : 2}
                strokeDasharray={isOverlay ? "6 3" : undefined}
                dot={isOverlay ? false : { r: 3 }}
                connectNulls
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
      <ChartLegend
        data={data}
        colorMap={colorMap}
        overlayEntities={overlayEntities}
      />
    </>
  );
}
