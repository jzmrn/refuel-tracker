import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { DailyStatsPoint } from "@/lib/api";
import { renderSvgFuelPrice } from "@/lib/formatPrice";
import { useLocalization } from "@/lib/i18n/LanguageContext";
import {
  axisConfig,
  useGridConfig,
  useAxisColor,
  createYAxisTick,
  customTooltipContainerStyle,
  tooltipStyle,
  renderLegendText,
  useChartKey,
} from "@/lib/chartConfig";

interface DailyStatsChartProps {
  data: DailyStatsPoint[];
  fuelType: "e5" | "e10" | "diesel";
  color: string;
  label: string;
}

export default function DailyStatsChart({
  data,
  fuelType,
  color,
  label,
}: DailyStatsChartProps) {
  const { formatDate } = useLocalization();
  const gridConfig = useGridConfig();
  const axisColor = useAxisColor();
  const chartKey = useChartKey(data);

  // Convert data to chart format and sort by date ascending
  const chartData = [...data]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((point) => ({
      date: new Date(point.date).getTime(),
      price_mean: point.price_mean,
      price_min: point.price_min,
      price_max: point.price_max,
      // Create range for area chart (min to max)
      range: [point.price_min, point.price_max],
    }));

  // Calculate Y-axis ticks
  const allPrices = data
    .flatMap((p) => [p.price_min, p.price_max, p.price_mean])
    .filter((v): v is number => v != null);

  let ticks: number[] | undefined = undefined;
  if (allPrices.length > 0) {
    const min = Math.min(...allPrices);
    const max = Math.max(...allPrices);
    const start = Math.floor(min * 1000) / 1000;
    const startCents = Math.round(start * 1000) % 10;
    let current = start - (startCents - 9) / 1000;
    ticks = [];
    while (current <= max + 0.005) {
      ticks.push(Math.round(current * 1000) / 1000);
      current += 0.01;
    }
  }

  // Calculate domain for X axis
  const dates = chartData.map((d) => d.date);
  const minDate = dates.length > 0 ? Math.min(...dates) : Date.now();
  const maxDate = dates.length > 0 ? Math.max(...dates) : Date.now();

  // Light color for the range area
  const areaColor = `${color}30`; // 30 is hex for ~19% opacity

  return (
    <div className="w-full h-72 sm:h-64 -mx-2 sm:mx-0">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          key={chartKey}
          data={chartData}
          margin={{ top: 5, right: 10, left: 5, bottom: 5 }}
        >
          <CartesianGrid {...gridConfig} />
          <XAxis
            dataKey="date"
            type="number"
            scale="time"
            domain={[minDate, maxDate]}
            tickFormatter={(timestamp) =>
              formatDate(new Date(timestamp), {
                day: "2-digit",
                month: "2-digit",
              })
            }
            {...axisConfig.xAxis}
          />
          <YAxis
            {...axisConfig.yAxis}
            width={50}
            domain={["auto", "auto"]}
            tick={createYAxisTick(axisColor, renderSvgFuelPrice)}
            ticks={ticks}
          />
          <Tooltip
            contentStyle={tooltipStyle.contentStyle}
            content={({ active, payload, label: tooltipLabel }) => {
              if (active && payload && payload.length > 0) {
                const dataPoint = payload[0].payload;
                return (
                  <div
                    className="p-3 rounded-lg shadow-lg"
                    style={customTooltipContainerStyle}
                  >
                    <p className="text-gray-300 text-sm mb-2">
                      {formatDate(new Date(tooltipLabel), {
                        weekday: "long",
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    <div className="space-y-1 text-sm">
                      <p className="text-white flex justify-between gap-4">
                        <span className="text-gray-400">Ø</span>
                        <span className="font-semibold">
                          {renderSvgFuelPrice(dataPoint.price_mean)}
                        </span>
                      </p>
                      <p className="text-green-400 flex justify-between gap-4">
                        <span className="text-gray-400">Min</span>
                        <span className="font-semibold">
                          {renderSvgFuelPrice(dataPoint.price_min)}
                        </span>
                      </p>
                      <p className="text-red-400 flex justify-between gap-4">
                        <span className="text-gray-400">Max</span>
                        <span className="font-semibold">
                          {renderSvgFuelPrice(dataPoint.price_max)}
                        </span>
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend formatter={renderLegendText} />
          {/* Area showing the range between min and max */}
          <Area
            type="linear"
            dataKey="range"
            fill={areaColor}
            stroke="none"
            connectNulls={false}
            legendType="none"
          />
          {/* Line for minimum price */}
          <Line
            type="linear"
            dataKey="price_min"
            stroke="#22c55e"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            name="Min"
            connectNulls={false}
          />
          {/* Line for maximum price */}
          <Line
            type="linear"
            dataKey="price_max"
            stroke="#ef4444"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            name="Max"
            connectNulls={false}
          />
          {/* Line for average price */}
          <Line
            type="linear"
            dataKey="price_mean"
            stroke={color}
            strokeWidth={2.5}
            dot={{ r: 4, fill: color, strokeWidth: 0 }}
            activeDot={{ r: 6, fill: color, strokeWidth: 2, stroke: "#ffffff" }}
            name="Ø"
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
