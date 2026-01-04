import React from "react";
import {
  RefuelStatistics as RefuelStatistics,
  RefuelMetric,
} from "../../lib/api";
import RefuelPriceChart from "./RefuelPriceChart";
import RefuelConsumptionChart from "./RefuelConsumptionChart";
import SummaryCard from "../common/SummaryCard";
import LoadingSpinner from "../common/LoadingSpinner";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import ScienceIcon from "@mui/icons-material/Science";
import BarChartIcon from "@mui/icons-material/BarChart";
import NumbersIcon from "@mui/icons-material/Numbers";
import { EmptyPanel } from "../common";
import { GridLayout } from "../common/GridLayout";
import { useTranslation } from "../../lib/i18n/LanguageContext";
import Panel from "../common/Panel";

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
  const { t } = useTranslation();
  if (loading) {
    return (
      <Panel title={t.refuels.statistics}>
        <LoadingSpinner text={t.refuels.loadingData} />
      </Panel>
    );
  }

  if (!statistics) {
    return (
      <EmptyPanel
        icon={
          <BarChartIcon className="icon-xl text-gray-600 dark:text-gray-400 mx-auto mb-4" />
        }
        title={t.common.noStatistics}
        className="empty-state"
      />
    );
  }

  const { cost_statistics } = statistics;

  const formatLiters = (liters: number) => liters.toFixed(2);
  const formatPricePerLiter = (price: number) => price.toFixed(3);

  return (
    <div className="space-y-6">
      {/* Summary Statistics Panel */}
      <Panel title={t.refuels.statistics}>
        <GridLayout variant="stats">
          <SummaryCard
            title={t.refuels.totalCost}
            value={{ value: cost_statistics.total_cost, unit: "€" }}
            icon={
              <AttachMoneyIcon className="icon-lg text-blue-600 dark:text-blue-400" />
            }
            iconBgColor="blue"
          />

          <SummaryCard
            title={t.refuels.amount}
            value={{
              value: formatLiters(cost_statistics.total_liters),
              unit: "L",
            }}
            icon={
              <ScienceIcon className="icon-lg text-green-600 dark:text-green-400" />
            }
            iconBgColor="green"
          />

          <SummaryCard
            title={t.refuels.pricePerLiter}
            value={{
              value: formatPricePerLiter(
                cost_statistics.average_price_per_liter,
              ),
              unit: "€/L",
            }}
            icon={
              <BarChartIcon className="icon-lg text-yellow-600 dark:text-yellow-400" />
            }
            iconBgColor="yellow"
          />

          <SummaryCard
            title={t.refuels.refuelEntries}
            value={{ value: cost_statistics.fill_up_count.toString() }}
            icon={
              <NumbersIcon className="icon-lg text-purple-600 dark:text-purple-400" />
            }
            iconBgColor="purple"
          />
        </GridLayout>
      </Panel>

      <RefuelPriceChart priceData={statistics.price_trends} />

      {/* Consumption Chart Panel */}
      {refuelData && <RefuelConsumptionChart refuelData={refuelData} />}
    </div>
  );
}
