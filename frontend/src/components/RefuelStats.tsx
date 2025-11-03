import React from "react";
import { RefuelStatistics as RefuelStatistics } from "../lib/api";

interface RefuelStatsProps {
  statistics: RefuelStatistics | null;
  loading?: boolean;
}

export default function RefuelStats({ statistics, loading }: RefuelStatsProps) {
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Statistics</h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading statistics...</span>
        </div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Statistics</h3>
        <div className="text-center py-8 text-gray-500">
          <p>No statistics available.</p>
        </div>
      </div>
    );
  }

  const { cost_statistics } = statistics;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const formatLiters = (liters: number) => {
    return `${liters.toFixed(2)} L`;
  };

  const formatPricePerLiter = (price: number) => {
    return `${price.toFixed(3)} €/L`;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Statistics</h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {formatCurrency(cost_statistics.total_cost)}
          </div>
          <div className="text-sm text-blue-600 font-medium">Total Cost</div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {formatLiters(cost_statistics.total_liters)}
          </div>
          <div className="text-sm text-green-600 font-medium">Total Liters</div>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">
            {formatPricePerLiter(cost_statistics.average_price_per_liter)}
          </div>
          <div className="text-sm text-yellow-600 font-medium">Avg Price/L</div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">
            {cost_statistics.fill_up_count}
          </div>
          <div className="text-sm text-purple-600 font-medium">
            Refuel Count
          </div>
        </div>
      </div>

      {statistics.price_trends.length > 0 && (
        <div className="mt-6">
          <h4 className="text-md font-semibold mb-3 text-gray-700">
            Price Trends (Recent Entries)
          </h4>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {statistics.price_trends.slice(0, 10).map((trend, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-gray-50 rounded"
              >
                <div className="text-sm text-gray-600">
                  {new Date(trend.timestamp).toLocaleDateString("en-US")}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm">{formatLiters(trend.amount)}</span>
                  <span className="text-sm font-medium">
                    {formatPricePerLiter(trend.price)}
                  </span>
                  <span className="text-sm font-bold text-blue-600">
                    {formatCurrency(trend.total_cost)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
