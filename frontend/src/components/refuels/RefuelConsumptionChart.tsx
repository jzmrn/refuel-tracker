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

interface RefuelDataForChart {
  timestamp: string;
  price: number;
  amount: number;
  kilometers_since_last_refuel: number;
  estimated_fuel_consumption: number;
  notes?: string;
}

interface RefuelConsumptionChartProps {
  refuelData: RefuelDataForChart[];
}

export default function RefuelConsumptionChart({
  refuelData,
}: RefuelConsumptionChartProps) {
  if (!refuelData || refuelData.length === 0) {
    return (
      <div className="mt-6">
        <h4 className="text-md font-semibold mb-3 text-gray-700">
          Fuel Consumption: Estimated vs Actual
        </h4>
        <div className="bg-gray-50 p-8 rounded-lg text-center text-gray-500">
          <p>No consumption data available</p>
          <p className="text-sm mt-1">
            Add more refuel entries to see consumption trends
          </p>
        </div>
      </div>
    );
  }

  // Process data and calculate actual consumption
  const chartData = refuelData
    .filter((item) => item.kilometers_since_last_refuel > 0 && item.amount > 0)
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    )
    .map((item) => {
      const actualConsumption =
        (item.amount / item.kilometers_since_last_refuel) * 100;
      return {
        ...item,
        timestampMs: new Date(item.timestamp).getTime(),
        displayDate: new Date(item.timestamp).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "2-digit",
        }),
        actualConsumption: parseFloat(actualConsumption.toFixed(2)),
        estimatedConsumption: parseFloat(
          item.estimated_fuel_consumption.toFixed(2),
        ),
        difference: parseFloat(
          (actualConsumption - item.estimated_fuel_consumption).toFixed(2),
        ),
      };
    });

  if (chartData.length === 0) {
    return (
      <div className="mt-6">
        <h4 className="text-md font-semibold mb-3 text-gray-700">
          Fuel Consumption: Estimated vs Actual
        </h4>
        <div className="bg-gray-50 p-8 rounded-lg text-center text-gray-500">
          <p>No valid consumption data available</p>
          <p className="text-sm mt-1">
            Make sure your entries have kilometers and fuel amount data
          </p>
        </div>
      </div>
    );
  }

  const formatConsumption = (value: number) => {
    return `${value.toFixed(1)} L/100km`;
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
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <div className="mb-2">
            <p className="font-medium text-gray-900">{formattedDate}</p>
            <p className="text-sm text-gray-600">{formattedTime}</p>
          </div>
          <div className="space-y-1 text-sm">
            <p className="text-blue-600">
              <span className="font-medium">Estimated:</span>{" "}
              {formatConsumption(data.estimatedConsumption)}
            </p>
            <p className="text-green-600">
              <span className="font-medium">Actual:</span>{" "}
              {formatConsumption(data.actualConsumption)}
            </p>
            <p
              className={`${
                data.difference > 0 ? "text-red-600" : "text-green-600"
              }`}
            >
              <span className="font-medium">Difference:</span>{" "}
              {data.difference > 0 ? "+" : ""}
              {formatConsumption(Math.abs(data.difference))}
            </p>
            <div className="border-t pt-2 mt-2">
              <p className="text-gray-600">
                <span className="font-medium">Distance:</span>{" "}
                {data.kilometers_since_last_refuel} km
              </p>
              <p className="text-gray-600">
                <span className="font-medium">Fuel:</span>{" "}
                {data.amount.toFixed(2)} L
              </p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Calculate statistics
  const avgActual =
    chartData.reduce((sum, item) => sum + item.actualConsumption, 0) /
    chartData.length;
  const avgEstimated =
    chartData.reduce((sum, item) => sum + item.estimatedConsumption, 0) /
    chartData.length;
  const avgDifference = avgActual - avgEstimated;
  const accurateEntries = chartData.filter(
    (item) => Math.abs(item.difference) <= 0.5,
  ).length;
  const accuracyPercentage = (accurateEntries / chartData.length) * 100;

  // Calculate Y-axis domain for better visualization
  const allValues = [
    ...chartData.map((d) => d.actualConsumption),
    ...chartData.map((d) => d.estimatedConsumption),
  ];
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const range = maxValue - minValue;
  const yAxisMin = Math.max(0, minValue - range * 0.1);
  const yAxisMax = maxValue + range * 0.1;

  return (
    <div className="mt-6">
      <h4 className="text-md font-semibold mb-3 text-gray-700">
        Fuel Consumption: Estimated vs Actual
      </h4>

      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <ResponsiveContainer width="100%" height={350}>
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
              domain={[yAxisMin, yAxisMax]}
              stroke="#666"
              fontSize={12}
              tickFormatter={(value) => `${value.toFixed(1)}`}
              label={{
                value: "Consumption (L/100km)",
                angle: -90,
                position: "insideLeft",
                style: { textAnchor: "middle" },
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="estimatedConsumption"
              stroke="#3b82f6"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{
                fill: "#3b82f6",
                strokeWidth: 2,
                r: 3,
              }}
              name="Estimated Consumption"
            />
            <Line
              type="monotone"
              dataKey="actualConsumption"
              stroke="#10b981"
              strokeWidth={3}
              dot={{
                fill: "#10b981",
                strokeWidth: 2,
                r: 4,
              }}
              activeDot={{
                r: 6,
                fill: "#059669",
                strokeWidth: 2,
                stroke: "#fff",
              }}
              name="Actual Consumption"
            />
          </LineChart>
        </ResponsiveContainer>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-green-50 p-3 rounded">
            <div className="font-medium text-green-900">Avg Actual</div>
            <div className="text-green-700">{formatConsumption(avgActual)}</div>
          </div>
          <div className="bg-blue-50 p-3 rounded">
            <div className="font-medium text-blue-900">Avg Estimated</div>
            <div className="text-blue-700">
              {formatConsumption(avgEstimated)}
            </div>
          </div>
          <div
            className={`${
              avgDifference > 0 ? "bg-red-50" : "bg-green-50"
            } p-3 rounded`}
          >
            <div
              className={`font-medium ${
                avgDifference > 0 ? "text-red-900" : "text-green-900"
              }`}
            >
              Avg Difference
            </div>
            <div
              className={`${
                avgDifference > 0 ? "text-red-700" : "text-green-700"
              }`}
            >
              {avgDifference > 0 ? "+" : ""}
              {formatConsumption(Math.abs(avgDifference))}
            </div>
          </div>
          <div className="bg-purple-50 p-3 rounded">
            <div className="font-medium text-purple-900">Accuracy</div>
            <div className="text-purple-700">
              {accuracyPercentage.toFixed(0)}%
            </div>
          </div>
        </div>

        <div className="mt-3 text-xs text-gray-600">
          <p>
            • <span className="font-medium">Accuracy</span> shows percentage of
            entries within ±0.5 L/100km of estimate
          </p>
          <p>
            •{" "}
            <span className="text-green-600 font-medium">
              Green line (solid)
            </span>
            : Actual consumption |
            <span className="text-blue-600 font-medium ml-1">
              Blue line (dashed)
            </span>
            : Your estimates
          </p>
        </div>
      </div>
    </div>
  );
}
