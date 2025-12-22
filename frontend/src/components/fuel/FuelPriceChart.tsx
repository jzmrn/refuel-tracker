import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface PriceHistoryPoint {
  timestamp: string;
  price_e5?: number;
  price_e10?: number;
  price_diesel?: number;
}

interface FuelPriceChartProps {
  data: PriceHistoryPoint[];
  fuelType: "e5" | "e10" | "diesel";
  color: string;
  label: string;
}

export default function FuelPriceChart({
  data,
  fuelType,
  color,
  label,
}: FuelPriceChartProps) {
  const chartData = data.map((point) => ({
    timestamp: new Date(point.timestamp).getTime(),
    price: point[`price_${fuelType}`],
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
  const prices = data
    .map((p) => p[`price_${fuelType}`])
    .filter((v): v is number => v != null);

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
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-gray-300 dark:stroke-gray-700"
          />
          <XAxis
            dataKey="timestamp"
            type="number"
            scale="time"
            domain={[() => Date.now() - 24 * 60 * 60 * 1000, () => Date.now()]}
            tickFormatter={(timestamp) =>
              new Date(timestamp).toLocaleString("de-DE", {
                hour: "2-digit",
                minute: "2-digit",
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
              const priceStr = payload.value.toFixed(3);
              const mainPart = priceStr.slice(0, -1);
              const superscript = priceStr.slice(-1);
              return (
                <g transform={`translate(${x},${y})`}>
                  <text
                    x={0}
                    y={0}
                    dy={4}
                    textAnchor="end"
                    className="text-xs fill-gray-600 dark:fill-gray-400"
                  >
                    <tspan>{mainPart}</tspan>
                    <tspan fontSize="0.8em" dy={-3}>
                      {superscript}
                    </tspan>
                    <tspan dy={3}>€</tspan>
                  </text>
                </g>
              );
            }}
            ticks={ticks}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-panel-background)",
              borderColor: "var(--color-border)",
              borderRadius: "8px",
            }}
            formatter={(value: number) => [`${value?.toFixed(3)}€`, label]}
            labelFormatter={(timestamp) =>
              new Date(timestamp).toLocaleString("de-DE", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })
            }
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
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
