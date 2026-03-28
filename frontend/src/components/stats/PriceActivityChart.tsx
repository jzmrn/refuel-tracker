import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  axisConfig,
  useGridConfig,
  useAxisColor,
  renderLegendText,
  useChartKey,
} from "@/lib/chartConfig";
import { DetailAggregate, buildColorMap, ChartTooltip } from "./chartUtils";
import { useLocalization } from "@/lib/i18n/LanguageContext";

interface ChartEntry {
  date: string;
  [entity: string]: string | number;
}

interface PriceActivityChartProps {
  data: DetailAggregate[];
}

export default function PriceActivityChart({ data }: PriceActivityChartProps) {
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
              valueFormatter={(v) => v.toFixed(2)}
            />
          }
        />
        <Legend formatter={renderLegendText} />
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
