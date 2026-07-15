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
import { useLocalization } from "@/lib/i18n/LanguageContext";
import {
  axisConfig,
  useGridConfig,
  useAxisColor,
  useChartKey,
  createYAxisTick,
} from "@/lib/chartConfig";
import { renderSvgFuelPrice } from "@/lib/formatPrice";
import { DetailAggregate, ChartTooltip, ChartLegend } from "./chartUtils";

interface ChartEntry {
  date: string;
  [entity: string]: string | number;
}

interface AvgPriceChartProps {
  data: DetailAggregate[];
  colorMap: Map<string, string>;
  /** Entities to render as dashed overlay lines */
  overlayEntities?: Set<string>;
}

export default function AvgPriceChart({
  data,
  colorMap,
  overlayEntities,
}: AvgPriceChartProps) {
  const { formatMonthLabel } = useLocalization();
  const gridConfig = useGridConfig();
  const axisColor = useAxisColor();
  const chartKey = useChartKey(data);

  const { chartData, entities } = useMemo(() => {
    const monthSet = new Set<string>();
    const entitySet = new Set<string>();
    const byMonth = new Map<string, Record<string, number>>();

    for (const d of data) {
      monthSet.add(d.date);
      entitySet.add(d.entity);
      const entry = byMonth.get(d.date) ?? {};
      entry[d.entity] = d.price_mean;
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
            domain={["auto", "auto"]}
            tick={createYAxisTick(axisColor, renderSvgFuelPrice)}
          />
          <Tooltip
            content={<ChartTooltip labelFormatter={formatMonthLabel} />}
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
