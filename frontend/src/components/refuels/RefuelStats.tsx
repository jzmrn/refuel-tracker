import React from "react";
import {
  RefuelStatistics as RefuelStatistics,
  RefuelMetric,
} from "../../lib/api";
import RefuelPriceChart from "./RefuelPriceChart";
import RefuelConsumptionChart from "./RefuelConsumptionChart";
import SummaryCard from "../common/SummaryCard";
import LoadingSpinner from "../common/LoadingSpinner";
import { CurrencyIcon, BeakerIcon, ChartIcon, HashIcon } from "../common/Icons";
import { GridLayout } from "../common/GridLayout";

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
        <LoadingSpinner text="Loading statistics..." />
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

  const formatLiters = (liters: number) => liters.toFixed(2);
  const formatPricePerLiter = (price: number) => price.toFixed(3);

  return (
    <div className="space-y-6">
      {/* Summary Statistics Panel */}
      <div className="panel">
        <h3 className="heading-3 mb-4">Summary Statistics</h3>
        <GridLayout variant="stats">
          <SummaryCard
            title="Total Cost"
            value={{ value: cost_statistics.total_cost, unit: "€" }}
            icon={<CurrencyIcon size="lg" color="blue" />}
            iconBgColor="blue"
          />

          <SummaryCard
            title="Total Liters"
            value={{
              value: formatLiters(cost_statistics.total_liters),
              unit: "L",
            }}
            icon={<BeakerIcon size="lg" color="green" />}
            iconBgColor="green"
          />

          <SummaryCard
            title="Avg Price/L"
            value={{
              value: formatPricePerLiter(
                cost_statistics.average_price_per_liter,
              ),
              unit: "€/L",
            }}
            icon={<ChartIcon size="lg" color="yellow" />}
            iconBgColor="yellow"
          />

          <SummaryCard
            title="Refuel Count"
            value={{ value: cost_statistics.fill_up_count.toString() }}
            icon={<HashIcon size="lg" color="purple" />}
            iconBgColor="purple"
          />
        </GridLayout>
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
