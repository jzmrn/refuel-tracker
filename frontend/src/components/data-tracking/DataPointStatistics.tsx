import React from "react";
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
import { format } from "date-fns";
import { DataPointResponse } from "@/lib/api";
import SummaryCard from "../common/SummaryCard";

interface DataPointStatisticsProps {
  dataPoints: DataPointResponse[];
  label: string;
  loading?: boolean;
}

export default function DataPointStatistics({
  dataPoints,
  label,
  loading,
}: DataPointStatisticsProps) {
  if (loading) {
    return (
      <div className="panel">
        <h3 className="heading-3 mb-4">Statistics for {label}</h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-secondary">Loading statistics...</span>
        </div>
      </div>
    );
  }

  if (!dataPoints || dataPoints.length === 0) {
    return (
      <div className="panel">
        <h3 className="heading-3 mb-4">Statistics for {label}</h3>
        <div className="text-center py-8 text-secondary">
          <p>No data points available for "{label}".</p>
          <p className="text-sm mt-1">
            Add some data points to see statistics.
          </p>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const values = dataPoints.map((point) => point.value);
  const count = values.length;
  const sum = values.reduce((acc, val) => acc + val, 0);
  const average = sum / count;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  // Calculate median
  const sortedValues = [...values].sort((a, b) => a - b);
  const median =
    count % 2 === 0
      ? (sortedValues[count / 2 - 1] + sortedValues[count / 2]) / 2
      : sortedValues[Math.floor(count / 2)];

  // Calculate standard deviation
  const variance =
    values.reduce((acc, val) => acc + Math.pow(val - average, 2), 0) / count;
  const standardDeviation = Math.sqrt(variance);

  // Prepare chart data
  const chartData = dataPoints
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    )
    .map((point, index) => ({
      ...point,
      timestampMs: new Date(point.timestamp).getTime(),
      displayDate: format(new Date(point.timestamp), "MMM d"),
      fullDate: format(new Date(point.timestamp), "MMM d, yyyy 'at' h:mm a"),
      index: index + 1,
    }));

  const formatValue = (value: number) => {
    return Number.isInteger(value) ? value.toString() : value.toFixed(2);
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
        <div className="card p-3 shadow-lg">
          <div className="mb-2">
            <p className="font-medium text-primary">{formattedDate}</p>
            <p className="text-sm text-secondary">{formattedTime}</p>
          </div>
          <div className="space-y-1 text-sm">
            <p className="status-blue">
              <span className="font-medium">Value:</span>{" "}
              {formatValue(data.value)}
            </p>
            {data.notes && (
              <p className="text-secondary mt-2 max-w-xs">
                <span className="font-medium">Notes:</span> {data.notes}
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Calculate trends (last 5 vs previous 5, or half vs half if less than 10)
  let trend = "stable";
  let trendPercentage = 0;
  if (count >= 4) {
    const splitPoint = Math.floor(count / 2);
    const firstHalf = values.slice(0, splitPoint);
    const secondHalf = values.slice(splitPoint);

    const firstAvg =
      firstHalf.reduce((acc, val) => acc + val, 0) / firstHalf.length;
    const secondAvg =
      secondHalf.reduce((acc, val) => acc + val, 0) / secondHalf.length;

    if (secondAvg > firstAvg) {
      trend = "increasing";
      trendPercentage = ((secondAvg - firstAvg) / firstAvg) * 100;
    } else if (secondAvg < firstAvg) {
      trend = "decreasing";
      trendPercentage = ((firstAvg - secondAvg) / firstAvg) * 100;
    }
  }

  return (
    <div className="panel p-6">
      <h3 className="heading-3 mb-4">Statistics for "{label}"</h3>

      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          title="Average"
          value={formatValue(average)}
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
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          }
          iconBgColor="blue"
        />

        <SummaryCard
          title="Median"
          value={formatValue(median)}
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
                d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
              />
            </svg>
          }
          iconBgColor="green"
        />

        <SummaryCard
          title="Range"
          value={formatValue(range)}
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
          iconBgColor="yellow"
        />

        <SummaryCard
          title="Total Entries"
          value={count.toString()}
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
                d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
              />
            </svg>
          }
          iconBgColor="purple"
        />
      </div>

      {/* Additional Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="status-red p-3 rounded">
          <div className="font-medium">Maximum</div>
          <div>{formatValue(max)}</div>
        </div>
        <div className="status-green p-3 rounded">
          <div className="font-medium">Minimum</div>
          <div>{formatValue(min)}</div>
        </div>
        <div className="status-gray p-3 rounded">
          <div className="font-medium">Std. Deviation</div>
          <div>{formatValue(standardDeviation)}</div>
        </div>
        <div
          className={`p-3 rounded ${
            trend === "increasing"
              ? "bg-green-50 dark:bg-green-900/20"
              : trend === "decreasing"
              ? "bg-red-50 dark:bg-red-900/20"
              : "bg-gray-50 dark:bg-gray-700"
          }`}
        >
          <div
            className={`font-medium ${
              trend === "increasing"
                ? "text-green-900 dark:text-green-400"
                : trend === "decreasing"
                ? "text-red-900 dark:text-red-400"
                : "text-gray-900 dark:text-gray-100"
            }`}
          >
            Trend
          </div>
          <div
            className={`${
              trend === "increasing"
                ? "text-green-700 dark:text-green-300"
                : trend === "decreasing"
                ? "text-red-700 dark:text-red-300"
                : "text-gray-700 dark:text-gray-300"
            }`}
          >
            {trend === "stable"
              ? "Stable"
              : trend === "increasing"
              ? `↗ +${trendPercentage.toFixed(1)}%`
              : `↘ -${trendPercentage.toFixed(1)}%`}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="mt-6">
        <h4 className="heading-4 mb-3">Values Over Time</h4>

        <div className="chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 20,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                type="number"
                dataKey="timestampMs"
                scale="time"
                domain={["dataMin", "dataMax"]}
                stroke="#666"
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
                stroke="#666"
                fontSize={12}
                tickFormatter={(value) => formatValue(value)}
                label={{
                  value: "Value",
                  angle: -90,
                  position: "insideLeft",
                  style: { textAnchor: "middle" },
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#2563eb"
                strokeWidth={3}
                dot={{
                  fill: "#2563eb",
                  strokeWidth: 2,
                  r: 4,
                }}
                activeDot={{
                  r: 6,
                  fill: "#1d4ed8",
                  strokeWidth: 2,
                  stroke: "#fff",
                }}
                name={label}
              />
            </LineChart>
          </ResponsiveContainer>

          <div className="mt-3 text-xs text-secondary">
            <p>
              • Hover over data points to see detailed information including
              notes
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
