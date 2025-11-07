import React, { useEffect, useState } from "react";
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
import SummaryCard from "../common/SummaryCard";

// Hook to get theme-appropriate colors
const useChartTheme = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
    };

    checkTheme();
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", checkTheme);

    return () => mediaQuery.removeEventListener("change", checkTheme);
  }, []);

  return {
    grid: isDark ? "#374151" : "#f0f0f0",
    axis: isDark ? "#9CA3AF" : "#666666",
    line: isDark ? "#3B82F6" : "#2563eb",
    dot: isDark ? "#3B82F6" : "#2563eb",
    activeDot: isDark ? "#1D4ED8" : "#1d4ed8",
    activeDotStroke: isDark ? "#1F2937" : "#ffffff",
  };
};

interface PriceTrend {
  date: string;
  timestamp: string;
  price: number;
  amount: number;
  total_cost: number;
}

interface RefuelPriceChartProps {
  priceData: PriceTrend[];
}

export default function RefuelPriceChart({ priceData }: RefuelPriceChartProps) {
  const chartTheme = useChartTheme();

  if (!priceData || priceData.length === 0) {
    return (
      <div className="content-section">
        <h4 className="heading-4 mb-3">Price Trends Over Time</h4>
        <div className="empty-state">
          <p>No price trend data available</p>
          <p className="text-sm mt-1">Add more refuel entries to see trends</p>
        </div>
      </div>
    );
  }

  // Sort data by timestamp to ensure proper chronological order
  const sortedData = [...priceData]
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    )
    .map((item) => ({
      ...item,
      timestampMs: new Date(item.timestamp).getTime(),
      displayDate: new Date(item.timestamp).toLocaleDateString("en-GB", {
        month: "short",
        day: "numeric",
        year: "2-digit",
      }),
      priceFormatted: parseFloat(item.price.toFixed(3)),
      totalCostFormatted: parseFloat(item.total_cost.toFixed(2)),
    }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPricePerLiter = (value: number) => {
    return `${value.toFixed(3)} €/L`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const date = new Date(label);
      const formattedDate = date.toLocaleDateString("en-GB", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const formattedTime = date.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      return (
        <div className="panel">
          <div className="mb-2">
            <p className="font-medium text-primary">{formattedDate}</p>
            <p className="text-sm text-secondary">{formattedTime}</p>
          </div>
          <div className="space-y-1 text-sm">
            <p className="text-blue-600 dark:text-blue-400">
              <span className="font-medium">Price per Liter:</span>{" "}
              {formatPricePerLiter(data.price)}
            </p>
            <p className="text-green-600 dark:text-green-400">
              <span className="font-medium">Amount:</span>{" "}
              {data.amount.toFixed(2)} L
            </p>
            <p className="text-purple-600 dark:text-purple-400">
              <span className="font-medium">Total Cost:</span>{" "}
              {formatCurrency(data.total_cost)}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Calculate min and max values for better scaling
  const prices = sortedData.map((d) => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;
  const yAxisMin = Math.max(0, minPrice - priceRange * 0.1);
  const yAxisMax = maxPrice + priceRange * 0.1;

  return (
    <div className="content-section">
      <h4 className="heading-4 mb-3">Price Trends Over Time</h4>

      <div className="chart-container">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={sortedData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 20,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
            <XAxis
              type="number"
              dataKey="timestampMs"
              scale="time"
              domain={["dataMin", "dataMax"]}
              stroke={chartTheme.axis}
              fontSize={12}
              tickMargin={10}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString("en-GB", {
                  month: "short",
                  day: "numeric",
                  year: "2-digit",
                });
              }}
            />
            <YAxis
              domain={[yAxisMin, yAxisMax]}
              stroke={chartTheme.axis}
              fontSize={12}
              tickFormatter={(value) => `${value.toFixed(2)}`}
              label={{
                value: "Price (€/L)",
                angle: -90,
                position: "insideLeft",
                style: { textAnchor: "middle" },
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="priceFormatted"
              stroke={chartTheme.line}
              strokeWidth={3}
              dot={{
                fill: chartTheme.dot,
                strokeWidth: 2,
                r: 4,
              }}
              activeDot={{
                r: 6,
                fill: chartTheme.activeDot,
                strokeWidth: 2,
                stroke: chartTheme.activeDotStroke,
              }}
              name="Price per Liter (€/L)"
            />
          </LineChart>
        </ResponsiveContainer>

        {sortedData.length > 0 && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <SummaryCard
              title="Current Price"
              value={formatPricePerLiter(
                sortedData[sortedData.length - 1].price,
              )}
              icon={
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                  />
                </svg>
              }
              iconBgColor="blue"
            />

            <SummaryCard
              title="Lowest Price"
              value={formatPricePerLiter(minPrice)}
              icon={
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                  />
                </svg>
              }
              iconBgColor="green"
            />

            <SummaryCard
              title="Highest Price"
              value={formatPricePerLiter(maxPrice)}
              icon={
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              }
              iconBgColor="red"
            />

            <SummaryCard
              title="Price Range"
              value={formatPricePerLiter(priceRange)}
              icon={
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              }
              iconBgColor="gray"
            />
          </div>
        )}
      </div>
    </div>
  );
}
