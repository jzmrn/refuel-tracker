import React from "react";
import {
  RefuelStatistics as RefuelStatistics,
  RefuelMetric,
} from "../../lib/api";
import RefuelPriceChart from "./RefuelPriceChart";
import RefuelConsumptionChart from "./RefuelConsumptionChart";

interface RefuelStatsProps {
  statistics: RefuelStatistics | null;
  refuelData?: RefuelMetric[];
  loading?: boolean;
}

export default function RefuelStats({
  statistics,
  refuelData,
  loading,
}: RefuelStatsProps) {
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

      {/* Price Chart */}
      <RefuelPriceChart priceData={statistics.price_trends} />

      {/* Consumption Chart */}
      {refuelData && <RefuelConsumptionChart refuelData={refuelData} />}
    </div>
  );
}
