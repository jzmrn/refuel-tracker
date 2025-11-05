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
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Statistics for {label}</h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading statistics...</span>
        </div>
      </div>
    );
  }

  if (!dataPoints || dataPoints.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Statistics for {label}</h3>
        <div className="text-center py-8 text-gray-500">
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
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
    .map((point, index) => ({
      ...point,
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
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{data.fullDate}</p>
          <div className="space-y-1 text-sm">
            <p className="text-blue-600">
              <span className="font-medium">Value:</span>{" "}
              {formatValue(data.value)}
            </p>
            {data.notes && (
              <p className="text-gray-600 mt-2 max-w-xs">
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
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Statistics for "{label}"</h3>

      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {formatValue(average)}
          </div>
          <div className="text-sm text-blue-600 font-medium">Average</div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {formatValue(median)}
          </div>
          <div className="text-sm text-green-600 font-medium">Median</div>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">
            {formatValue(range)}
          </div>
          <div className="text-sm text-yellow-600 font-medium">Range</div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">{count}</div>
          <div className="text-sm text-purple-600 font-medium">
            Total Entries
          </div>
        </div>
      </div>

      {/* Additional Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-red-50 p-3 rounded">
          <div className="font-medium text-red-900">Maximum</div>
          <div className="text-red-700">{formatValue(max)}</div>
        </div>
        <div className="bg-green-50 p-3 rounded">
          <div className="font-medium text-green-900">Minimum</div>
          <div className="text-green-700">{formatValue(min)}</div>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <div className="font-medium text-gray-900">Std. Deviation</div>
          <div className="text-gray-700">{formatValue(standardDeviation)}</div>
        </div>
        <div
          className={`p-3 rounded ${
            trend === "increasing"
              ? "bg-green-50"
              : trend === "decreasing"
              ? "bg-red-50"
              : "bg-gray-50"
          }`}
        >
          <div
            className={`font-medium ${
              trend === "increasing"
                ? "text-green-900"
                : trend === "decreasing"
                ? "text-red-900"
                : "text-gray-900"
            }`}
          >
            Trend
          </div>
          <div
            className={`${
              trend === "increasing"
                ? "text-green-700"
                : trend === "decreasing"
                ? "text-red-700"
                : "text-gray-700"
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
        <h4 className="text-md font-semibold mb-3 text-gray-700">
          Values Over Time
        </h4>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
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
                dataKey="displayDate"
                stroke="#666"
                fontSize={12}
                tickMargin={10}
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

          <div className="mt-3 text-xs text-gray-600">
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
