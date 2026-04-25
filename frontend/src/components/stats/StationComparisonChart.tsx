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
import { renderSvgFuelPrice } from "@/lib/formatPrice";
import {
  axisConfig,
  useGridConfig,
  useAxisColor,
  useChartKey,
  createYAxisTick,
  calculateFuelPriceTicks,
} from "@/lib/chartConfig";
import {
  ChartTooltip,
  ChartNoData,
  CHART_HEIGHT,
  useChartDateFormatters,
  COMPARISON_TYPE_COLORS,
} from "./chartUtils";
import type { StationComparisonResponse } from "@/lib/api";

interface StationComparisonChartProps {
  data: StationComparisonResponse;
  /** Maps type keys ("station", "place", "brand") to display labels */
  labelMap?: Record<string, string>;
}

interface ChartEntry {
  date: string;
  [label: string]: string | number | undefined;
}

/** Chart type identifiers used as data keys */
const SERIES_TYPES = ["station", "place", "brand"] as const;
type SeriesType = (typeof SERIES_TYPES)[number];

export default function StationComparisonChart({
  data,
  labelMap = {},
}: StationComparisonChartProps) {
  const gridConfig = useGridConfig();
  const axisColor = useAxisColor();
  const chartKey = useChartKey(data);
  const { formatAxisDate, formatTooltipDate } = useChartDateFormatters();

  const { chartData, activeTypes } = useMemo(() => {
    const dateSet = new Set<string>();
    const byDate = new Map<string, Record<string, number>>();
    const activeTypes: SeriesType[] = [];

    // Use fixed type keys instead of API labels
    const seriesMap: Record<SeriesType, typeof data.station> = {
      station: data.station,
      place: data.place,
      brand: data.brand,
    };

    for (const type of SERIES_TYPES) {
      const s = seriesMap[type];
      if (s.data.length > 0) {
        activeTypes.push(type);
        for (const point of s.data) {
          dateSet.add(point.date);
          const entry = byDate.get(point.date) ?? {};
          entry[type] = point.price_mean;
          byDate.set(point.date, entry);
        }
      }
    }

    const dates = Array.from(dateSet).sort();
    const chartData: ChartEntry[] = dates.map((date) => ({
      date,
      ...(byDate.get(date) ?? {}),
    }));

    return { chartData, activeTypes };
  }, [data]);

  // Calculate Y-axis ticks ending in .009
  const ticks = useMemo(() => {
    const allPrices = [
      ...data.station.data.map((p) => p.price_mean),
      ...data.place.data.map((p) => p.price_mean),
      ...data.brand.data.map((p) => p.price_mean),
    ].filter((v): v is number => v != null);
    return calculateFuelPriceTicks(allPrices);
  }, [data]);

  if (chartData.length === 0) {
    return <ChartNoData />;
  }

  return (
    <div className={`w-full ${CHART_HEIGHT} -mx-2 sm:mx-0`}>
      <ResponsiveContainer width="100%" height="100%">
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
            tickFormatter={formatAxisDate}
          />
          <YAxis
            {...axisConfig.yAxis}
            width={50}
            stroke={axisColor}
            domain={
              ticks && ticks.length >= 2
                ? [ticks[0], ticks[ticks.length - 1]]
                : ["auto", "auto"]
            }
            tick={createYAxisTick(axisColor, renderSvgFuelPrice)}
            ticks={ticks}
          />
          <Tooltip
            content={
              <ChartTooltip labelFormatter={formatTooltipDate} isFuelPrice />
            }
          />
          {activeTypes.map((type) => (
            <Line
              key={type}
              type="monotone"
              dataKey={type}
              stroke={COMPARISON_TYPE_COLORS[type]}
              name={labelMap[type] || type}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
