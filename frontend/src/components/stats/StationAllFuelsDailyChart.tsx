import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { renderSvgFuelPrice } from "@/lib/formatPrice";
import {
  axisConfig,
  useGridConfig,
  useAxisColor,
  useChartKey,
  renderLegendText,
  createYAxisTick,
  calculateFuelPriceTicks,
} from "@/lib/chartConfig";
import {
  ChartTooltip,
  ChartNoData,
  CHART_HEIGHT,
  useChartDateFormatters,
  buildColorMap,
} from "./chartUtils";
import type { DailyPricePoint } from "@/lib/api";

interface StationAllFuelsDailyChartProps {
  data: DailyPricePoint[];
}

const FUEL_KEYS = ["e5", "e10", "diesel"] as const;

export default function StationAllFuelsDailyChart({
  data,
}: StationAllFuelsDailyChartProps) {
  const { t } = useTranslation();
  const gridConfig = useGridConfig();
  const axisColor = useAxisColor();
  const chartKey = useChartKey(data);
  const { formatAxisDate, formatTooltipDate } = useChartDateFormatters();

  const fuelLabels: Record<string, string> = useMemo(
    () => ({
      e5: t.fuelPrices.e5,
      e10: t.fuelPrices.e10,
      diesel: t.fuelPrices.diesel,
    }),
    [t],
  );

  const colorMap = useMemo(
    () => buildColorMap(FUEL_KEYS.map((k) => fuelLabels[k])),
    [fuelLabels],
  );

  const chartData = useMemo(
    () =>
      data.map((d) => ({
        date: d.date,
        [fuelLabels.e5]: d.e5,
        [fuelLabels.e10]: d.e10,
        [fuelLabels.diesel]: d.diesel,
      })),
    [data, fuelLabels],
  );

  // Calculate Y-axis ticks ending in .009
  const ticks = useMemo(() => {
    const allPrices = data
      .flatMap((d) => [d.e5, d.e10, d.diesel])
      .filter((v): v is number => v != null);
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
          <Legend iconType="plainline" formatter={renderLegendText} />
          {FUEL_KEYS.map((key) => {
            const label = fuelLabels[key];
            return (
              <Line
                key={label}
                type="monotone"
                dataKey={label}
                stroke={colorMap.get(label)}
                name={label}
                strokeWidth={2}
                dot={false}
                connectNulls
                legendType="plainline"
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
