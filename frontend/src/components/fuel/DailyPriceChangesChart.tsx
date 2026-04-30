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
  useAxisColor,
  customTooltipContainerStyle,
  renderLegendText,
  useChartKey,
} from "@/lib/chartConfig";
import { ChartNoData, CHART_HEIGHT } from "@/components/stats/chartUtils";

interface DailyPriceChangesChartProps {
  data: DailyStatsPoint[];
}

export default function DailyPriceChangesChart({
  data,
}: DailyPriceChangesChartProps) {
  const { t } = useTranslation();
  const { formatDate } = useLocalization();
  const gridConfig = useGridConfig();
  const axisColor = useAxisColor();
  const chartKey = useChartKey(data);

  // Check if we have valid data
  const hasValidData =
    data.length > 0 &&
    data.some(
      (point) => point.n_price_changes != null || point.n_unique_prices != null,
    );

  // Check if increased/decreased data is available
  const hasIncreasedDecreased = data.some(
    (point) =>
      point.n_price_increased != null && point.n_price_decreased != null,
  );

  if (!hasValidData) {
    return <ChartNoData />;
  }

  // Convert data to chart format and sort by date ascending
  const chartData = [...data]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((point) => ({
      date: new Date(point.date).getTime(),
      n_price_changes: point.n_price_changes,
      n_unique_prices: point.n_unique_prices,
      n_price_increased: point.n_price_increased,
      n_price_decreased: point.n_price_decreased,
    }));

  // Calculate domain for X axis
  const dates = chartData.map((d) => d.date);
  const minDate = dates.length > 0 ? Math.min(...dates) : Date.now();
  const maxDate = dates.length > 0 ? Math.max(...dates) : Date.now();

  return (
    <div className={`w-full ${CHART_HEIGHT} -mx-2 sm:mx-0`}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          key={chartKey}
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
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
            stroke={axisColor}
          />
          <YAxis
            {...axisConfig.yAxis}
            width={50}
            stroke={axisColor}
            domain={[0, "dataMax"]}
            allowDecimals={false}
          />
          <Tooltip
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
                      <p className="text-purple-400 flex justify-between gap-4">
                        <span className="text-gray-400">
                          {t.fuelPrices.uniquePrices}:
                        </span>
                        <span className="font-semibold">
                          {dataPoint.n_unique_prices}
                        </span>
                      </p>
                      <p className="text-amber-400 flex justify-between gap-4">
                        <span className="text-gray-400">
                          {t.fuelPrices.priceChanges}:
                        </span>
                        <span className="font-semibold">
                          {dataPoint.n_price_changes}
                        </span>
                      </p>
                      {hasIncreasedDecreased && (
                        <>
                          <p className="text-red-400 flex justify-between gap-4">
                            <span className="text-gray-400">
                              {t.fuelPrices.priceIncreased}:
                            </span>
                            <span className="font-semibold">
                              {dataPoint.n_price_increased ?? "-"}
                            </span>
                          </p>
                          <p className="text-green-400 flex justify-between gap-4">
                            <span className="text-gray-400">
                              {t.fuelPrices.priceDecreased}:
                            </span>
                            <span className="font-semibold">
                              {dataPoint.n_price_decreased ?? "-"}
                            </span>
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend iconType="line" formatter={renderLegendText} />
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
          {/* Line for price increases (only if data available) */}
          {hasIncreasedDecreased && (
            <Line
              type="linear"
              dataKey="n_price_increased"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ fill: "#ef4444", r: 3 }}
              name={t.fuelPrices.priceIncreased}
              connectNulls={false}
            />
          )}
          {/* Line for price decreases (only if data available) */}
          {hasIncreasedDecreased && (
            <Line
              type="linear"
              dataKey="n_price_decreased"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ fill: "#22c55e", r: 3 }}
              name={t.fuelPrices.priceDecreased}
              connectNulls={false}
            />
          )}
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
