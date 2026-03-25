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
import { renderSvgFuelPrice } from "@/lib/formatPrice";
import { useLocalization } from "@/lib/i18n/LanguageContext";
import {
  axisConfig,
  useGridConfig,
  useAxisColor,
  createYAxisTick,
  customTooltipContainerStyle,
  renderLegendText,
  tooltipStyle,
} from "@/lib/chartConfig";

interface PriceHistoryPoint {
  timestamp: string;
  price_e5?: number;
  price_e10?: number;
  price_diesel?: number;
}

interface SingleFuelPriceHistoryPoint {
  timestamp: string;
  price?: number;
}

interface FuelPriceChartProps {
  data: PriceHistoryPoint[] | SingleFuelPriceHistoryPoint[];
  fuelType: "e5" | "e10" | "diesel";
  color: string;
  label: string;
  timeRangeHours?: number;
}

// Type guard to check if data is multi-fuel format
function isMultiFuelData(
  data: PriceHistoryPoint[] | SingleFuelPriceHistoryPoint[],
): data is PriceHistoryPoint[] {
  if (data.length === 0) return false;
  const first = data[0];
  return "price_e5" in first || "price_e10" in first || "price_diesel" in first;
}

export default function FuelPriceChart({
  data,
  fuelType,
  color,
  label,
  timeRangeHours = 24,
}: FuelPriceChartProps) {
  const { formatDate } = useLocalization();
  const gridConfig = useGridConfig();
  const axisColor = useAxisColor();

  // Convert data to chart format based on data type
  const chartData = isMultiFuelData(data)
    ? data.map((point) => ({
        timestamp: new Date(point.timestamp).getTime(),
        price: point[`price_${fuelType}`],
      }))
    : data.map((point) => ({
        timestamp: new Date(point.timestamp).getTime(),
        price: point.price,
      }));

  // Split data into segments (break on null values)
  const segments: Array<Array<{ timestamp: number; price?: number }>> = [];
  let currentSegment: Array<{ timestamp: number; price?: number }> = [];

  chartData.forEach((point) => {
    if (point.price != null) {
      currentSegment.push(point);
    } else {
      if (currentSegment.length > 0) {
        segments.push(currentSegment);
        currentSegment = [];
      }
    }
  });

  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }

  // Calculate ticks for Y-axis
  const prices = isMultiFuelData(data)
    ? data
        .map((p) => p[`price_${fuelType}`])
        .filter((v): v is number => v != null)
    : data.map((p) => p.price).filter((v): v is number => v != null);

  let ticks: number[] | undefined = undefined;
  if (prices.length > 0) {
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const start = Math.floor(min * 1000) / 1000;
    const startCents = Math.round(start * 1000) % 10;
    let current = start - (startCents - 9) / 1000;
    ticks = [];
    while (current <= max) {
      ticks.push(Math.round(current * 1000) / 1000);
      current += 0.01;
    }
  }

  return (
    <div className="w-full h-72 sm:h-64 -mx-2 sm:mx-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 10, left: 5, bottom: 5 }}
        >
          <CartesianGrid {...gridConfig} />
          <XAxis
            dataKey="timestamp"
            type="number"
            scale="time"
            domain={[
              () => Date.now() - timeRangeHours * 60 * 60 * 1000,
              () => Date.now(),
            ]}
            allowDataOverflow={true}
            tickFormatter={(timestamp) =>
              formatDate(new Date(timestamp), {
                ...(timeRangeHours > 24 && {
                  day: "2-digit",
                  month: "2-digit",
                }),
                hour: "2-digit",
                minute: "2-digit",
              })
            }
            {...axisConfig.xAxis}
          />
          <YAxis
            {...axisConfig.yAxis}
            width={50}
            domain={["auto", "auto"]}
            allowDataOverflow={true}
            tick={createYAxisTick(axisColor, renderSvgFuelPrice)}
            ticks={ticks}
          />
          <Tooltip
            contentStyle={tooltipStyle.contentStyle}
            content={({ active, payload, label: timestamp }) => {
              if (active && payload && payload.length > 0) {
                const price = payload[0].value as number;
                return (
                  <div
                    className="p-3 rounded-lg shadow-lg"
                    style={customTooltipContainerStyle}
                  >
                    <p className="text-gray-300 text-sm mb-2">
                      {formatDate(new Date(timestamp), {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="text-sm text-white font-semibold flex justify-between gap-4">
                      <span className="text-gray-400 font-normal">{label}</span>
                      <span>{renderSvgFuelPrice(price)}</span>
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend
            wrapperStyle={{ paddingTop: "10px" }}
            formatter={renderLegendText}
          />
          {segments.map((segment, index) => (
            <Line
              key={index}
              type="stepAfter"
              data={segment}
              dataKey="price"
              stroke={color}
              strokeWidth={2}
              dot={false}
              name={label}
              connectNulls={false}
              // Only show legend for the first segment to avoid duplicates
              legendType={index === 0 ? "plainline" : "none"}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
