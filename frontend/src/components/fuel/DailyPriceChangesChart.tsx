import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { DailyStatsPoint } from "@/lib/api";
import { useTranslation } from "@/lib/i18n/LanguageContext";

interface DailyPriceChangesChartProps {
  data: DailyStatsPoint[];
}

export default function DailyPriceChangesChart({
  data,
}: DailyPriceChangesChartProps) {
  const { t } = useTranslation();

  // Convert data to chart format and sort by date ascending
  const chartData = [...data]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((point) => ({
      date: new Date(point.date).getTime(),
      n_price_changes: point.n_price_changes,
      n_unique_prices: point.n_unique_prices,
    }));

  // Calculate Y-axis domain
  const allValues = data.flatMap((p) => [p.n_price_changes, p.n_unique_prices]);
  const maxValue = allValues.length > 0 ? Math.max(...allValues) : 10;

  // Calculate domain for X axis
  const dates = chartData.map((d) => d.date);
  const minDate = dates.length > 0 ? Math.min(...dates) : Date.now();
  const maxDate = dates.length > 0 ? Math.max(...dates) : Date.now();

  // Add some padding to the domain
  const padding = (maxDate - minDate) * 0.05;

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
            width={40}
            domain={[0, Math.ceil(maxValue * 1.1)]}
            allowDecimals={false}
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
                      <p className="text-amber-400">
                        <span className="text-gray-400">
                          {t.fuelPrices.priceChanges}:{" "}
                        </span>
                        <span className="font-semibold">
                          {dataPoint.n_price_changes}
                        </span>
                      </p>
                      <p className="text-purple-400">
                        <span className="text-gray-400">
                          {t.fuelPrices.uniquePrices}:{" "}
                        </span>
                        <span className="font-semibold">
                          {dataPoint.n_unique_prices}
                        </span>
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
          {/* Line for price changes */}
          <Line
            type="linear"
            dataKey="n_price_changes"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ fill: "#f59e0b", r: 3 }}
            name={t.fuelPrices.priceChanges}
            connectNulls={false}
          />
          {/* Line for unique prices */}
          <Line
            type="linear"
            dataKey="n_unique_prices"
            stroke="#a855f7"
            strokeWidth={2}
            dot={{ fill: "#a855f7", r: 3 }}
            name={t.fuelPrices.uniquePrices}
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
