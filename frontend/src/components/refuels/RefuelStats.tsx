import React from "react";
import {
  RefuelStatistics as RefuelStatistics,
  RefuelMetric,
} from "../../lib/api";
import RefuelPriceChart from "./RefuelPriceChart";
import RefuelConsumptionChart from "./RefuelConsumptionChart";
import SummaryCard from "../common/SummaryCard";

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
      <div className="panel">
        <h3 className="heading-3 mb-4">Statistics</h3>
        <div className="flex items-center justify-center py-8">
          <div className="loading-spinner"></div>
          <span className="loading-text">Loading statistics...</span>
        </div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="panel">
        <h3 className="heading-3 mb-4">Statistics</h3>
        <div className="empty-state">
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
    <div className="space-y-6">
      {/* Summary Statistics Panel */}
      <div className="panel">
        <h3 className="heading-3 mb-4">Summary Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard
            title="Total Cost"
            value={formatCurrency(cost_statistics.total_cost)}
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
            title="Total Liters"
            value={formatLiters(cost_statistics.total_liters)}
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
                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                />
              </svg>
            }
            iconBgColor="green"
          />

          <SummaryCard
            title="Avg Price/L"
            value={formatPricePerLiter(cost_statistics.average_price_per_liter)}
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
            iconBgColor="yellow"
          />

          <SummaryCard
            title="Refuel Count"
            value={cost_statistics.fill_up_count.toString()}
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
      </div>

      {/* Charts Panel */}
      <div className="panel">
        <h3 className="heading-3 mb-4">Charts & Analysis</h3>

        {/* Price Chart */}
        <RefuelPriceChart priceData={statistics.price_trends} />

        {/* Consumption Chart */}
        {refuelData && <RefuelConsumptionChart refuelData={refuelData} />}
      </div>
    </div>
  );
}
