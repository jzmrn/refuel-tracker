import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import { DailyStatsPoint } from "@/lib/api";
import { renderSvgFuelPrice, formatFuelPrice } from "@/lib/formatPrice";

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

  // Add some padding to the domain
  const padding = (maxDate - minDate) * 0.05;

  // Light color for the range area
  const areaColor = `${color}30`; // 30 is hex for ~19% opacity

  return (
    <div className="w-full h-72 sm:h-64 -mx-2 sm:mx-0">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 5, right: 10, left: 5, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-gray-300 dark:stroke-gray-700"
          />
          <XAxis
            dataKey="date"
            type="number"
            scale="time"
            domain={[minDate - padding, maxDate + padding]}
            tickFormatter={(timestamp) =>
              new Date(timestamp).toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "2-digit",
              })
            }
            className="text-xs fill-gray-600 dark:fill-gray-400"
            angle={-45}
            textAnchor="end"
            height={70}
            tick={{ fontSize: 10 }}
          />
          <YAxis
            className="text-xs fill-gray-600 dark:fill-gray-400"
            width={50}
            domain={["auto", "auto"]}
            tick={(props: any) => {
              const { x, y, payload } = props;
              return (
                <g transform={`translate(${x},${y})`}>
                  <text
                    x={0}
                    y={0}
                    dy={4}
                    textAnchor="end"
                    className="text-xs fill-gray-600 dark:fill-gray-400"
                  >
                    {renderSvgFuelPrice(payload.value)}
                  </text>
                </g>
              );
            }}
            ticks={ticks}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1f2937",
              borderColor: "#4b5563",
              borderRadius: "8px",
              color: "#f9fafb",
              boxShadow:
                "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            }}
            content={({ active, payload, label: tooltipLabel }) => {
              if (active && payload && payload.length > 0) {
                const dataPoint = payload[0].payload;
                return (
                  <div
                    className="p-3 rounded-lg shadow-lg"
                    style={{
                      backgroundColor: "#1f2937",
                      borderColor: "#4b5563",
                      border: "1px solid #4b5563",
                    }}
                  >
                    <p className="text-gray-300 text-sm mb-2">
                      {new Date(tooltipLabel).toLocaleDateString("de-DE", {
                        weekday: "short",
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </p>
                    <div className="space-y-1 text-sm">
                      <p className="text-white">
                        <span className="text-gray-400">Ø </span>
                        <span className="font-semibold">
                          {formatFuelPrice(dataPoint.price_mean, {
                            showCurrency: true,
                            superscriptClass: "text-xs",
                          })}
                        </span>
                      </p>
                      <p className="text-green-400">
                        <span className="text-gray-400">Min: </span>
                        {formatFuelPrice(dataPoint.price_min, {
                          showCurrency: true,
                          superscriptClass: "text-xs",
                        })}
                      </p>
                      <p className="text-red-400">
                        <span className="text-gray-400">Max: </span>
                        {formatFuelPrice(dataPoint.price_max, {
                          showCurrency: true,
                          superscriptClass: "text-xs",
                        })}
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend
            wrapperStyle={{ paddingTop: "10px" }}
            formatter={(value) => (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {value}
              </span>
            )}
          />
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
            stroke="#ffffff"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#ffffff", strokeWidth: 0 }}
            activeDot={{ r: 6, fill: "#ffffff", strokeWidth: 2, stroke: color }}
            name="Ø"
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
