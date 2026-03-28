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
import { useTranslation, useLocalization } from "@/lib/i18n/LanguageContext";
import {
  axisConfig,
  useGridConfig,
  customTooltipContainerStyle,
  tooltipStyle,
  renderLegendText,
  useChartKey,
} from "@/lib/chartConfig";

interface DailyPriceChangesChartProps {
  data: DailyStatsPoint[];
}

export default function DailyPriceChangesChart({
  data,
}: DailyPriceChangesChartProps) {
  const { t } = useTranslation();
  const { formatDate } = useLocalization();
  const gridConfig = useGridConfig();
  const chartKey = useChartKey(data);

  // Convert data to chart format and sort by date ascending
  const chartData = [...data]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((point) => ({
      date: new Date(point.date).getTime(),
      n_price_changes: point.n_price_changes,
      n_unique_prices: point.n_unique_prices,
    }));

  // Calculate domain for X axis
  const dates = chartData.map((d) => d.date);
  const minDate = dates.length > 0 ? Math.min(...dates) : Date.now();
  const maxDate = dates.length > 0 ? Math.max(...dates) : Date.now();

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
            domain={[0, "dataMax"]}
            allowDecimals={false}
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
                      <p className="text-amber-400 flex justify-between gap-4">
                        <span className="text-gray-400">
                          {t.fuelPrices.priceChanges}:
                        </span>
                        <span className="font-semibold">
                          {dataPoint.n_price_changes}
                        </span>
                      </p>
                      <p className="text-purple-400 flex justify-between gap-4">
                        <span className="text-gray-400">
                          {t.fuelPrices.uniquePrices}:
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
          <Legend formatter={renderLegendText} />
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
