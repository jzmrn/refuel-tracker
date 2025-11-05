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
  if (!priceData || priceData.length === 0) {
    return (
      <div className="mt-6">
        <h4 className="text-md font-semibold mb-3 text-gray-700">
          Price Trends Over Time
        </h4>
        <div className="bg-gray-50 p-8 rounded-lg text-center text-gray-500">
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
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <div className="mb-2">
            <p className="font-medium text-gray-900">{formattedDate}</p>
            <p className="text-sm text-gray-600">{formattedTime}</p>
          </div>
          <div className="space-y-1 text-sm">
            <p className="text-blue-600">
              <span className="font-medium">Price per Liter:</span>{" "}
              {formatPricePerLiter(data.price)}
            </p>
            <p className="text-green-600">
              <span className="font-medium">Amount:</span>{" "}
              {data.amount.toFixed(2)} L
            </p>
            <p className="text-purple-600">
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
    <div className="mt-6">
      <h4 className="text-md font-semibold mb-3 text-gray-700">
        Price Trends Over Time
      </h4>

      <div className="bg-white p-4 rounded-lg border border-gray-200">
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
              name="Price per Liter (€/L)"
            />
          </LineChart>
        </ResponsiveContainer>

        {sortedData.length > 0 && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-blue-50 p-3 rounded">
              <div className="font-medium text-blue-900">Current Price</div>
              <div className="text-blue-700">
                {formatPricePerLiter(sortedData[sortedData.length - 1].price)}
              </div>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <div className="font-medium text-green-900">Lowest Price</div>
              <div className="text-green-700">
                {formatPricePerLiter(minPrice)}
              </div>
            </div>
            <div className="bg-red-50 p-3 rounded">
              <div className="font-medium text-red-900">Highest Price</div>
              <div className="text-red-700">
                {formatPricePerLiter(maxPrice)}
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="font-medium text-gray-900">Price Range</div>
              <div className="text-gray-700">
                {formatPricePerLiter(priceRange)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
