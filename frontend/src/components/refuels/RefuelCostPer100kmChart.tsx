import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import SummaryCard from "../common/SummaryCard";
import Panel from "../common/Panel";
import { GridLayout } from "../common/GridLayout";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import BarChartIcon from "@mui/icons-material/BarChart";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import {
  useTranslation,
  useLocalization,
} from "../../lib/i18n/LanguageContext";
import { useChartTheme } from "../../lib/theme";
import { axisConfig, useGridConfig, useChartKey } from "../../lib/chartConfig";
import { renderSvgFuelPrice } from "../../lib/formatPrice";

interface RefuelDataForChart {
  timestamp: string;
  price: number;
  amount: number;
  kilometers_since_last_refuel: number;
  estimated_fuel_consumption: number;
  notes?: string;
}

interface RefuelCostPer100kmChartProps {
  refuelData: RefuelDataForChart[];
}

export default function RefuelCostPer100kmChart({
  refuelData,
}: RefuelCostPer100kmChartProps) {
  const { t } = useTranslation();
  const { formatDate } = useLocalization();
  const chartTheme = useChartTheme();
  const gridConfig = useGridConfig();
  const chartKey = useChartKey(refuelData);

  if (!refuelData || refuelData.length === 0) {
    return (
      <Panel title={t.refuels.costPer100km}>
        <div className="empty-state">
          <p>{t.refuels.noCostDataAvailable}</p>
          <p className="text-sm mt-1">
            {t.refuels.addMoreRefuelEntriesToSeeCostTrends}
          </p>
        </div>
      </Panel>
    );
  }

  // Process data and calculate cost per 100km
  // Cost per 100km = (amount * price / distance) * 100
  const chartData = useMemo(() => {
    return refuelData
      .filter(
        (item) =>
          item.amount > 0 &&
          item.price > 0 &&
          item.kilometers_since_last_refuel > 0,
      )
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      )
      .map((item) => {
        // Total fuel cost for this refuel
        const totalCost = item.amount * item.price;
        // Cost per 100km = total cost / distance * 100
        const costPer100km =
          (totalCost / item.kilometers_since_last_refuel) * 100;
        // Actual consumption in L/100km
        const actualConsumption =
          (item.amount / item.kilometers_since_last_refuel) * 100;

        return {
          ...item,
          timestampMs: new Date(item.timestamp).getTime(),
          displayDate: formatDate(new Date(item.timestamp), {
            month: "short",
            day: "numeric",
            year: "2-digit",
          }),
          costPer100km: parseFloat(costPer100km.toFixed(2)),
          consumption: parseFloat(actualConsumption.toFixed(2)),
          pricePerLiter: item.price,
        };
      });
  }, [refuelData, formatDate]);

  if (chartData.length === 0) {
    return (
      <Panel title={t.refuels.costPer100km}>
        <div className="empty-state">
          <p>{t.refuels.noValidCostDataAvailable}</p>
          <p className="text-sm mt-1">
            {t.refuels.makeSureEntriesHaveCostData}
          </p>
        </div>
      </Panel>
    );
  }

  const formatCost = (value: number) => `${value.toFixed(2)}`;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const date = new Date(data.timestamp);
      const formattedDate = formatDate(date, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
      const formattedTime = formatDate(date, {
        hour: "2-digit",
        minute: "2-digit",
      });
      return (
        <div className="panel">
          <div className="mb-2">
            <p className="text-primary font-medium">{formattedDate}</p>
            <p className="text-sm text-secondary">{formattedTime}</p>
          </div>
          <div className="space-y-1 text-sm">
            <p className="flex justify-between gap-4">
              <span className="text-gray-400">{t.refuels.fuel}:</span>
              <span className="text-secondary font-semibold">
                {data.amount.toFixed(2)} L
              </span>
            </p>
            <p className="flex justify-between gap-4">
              <span className="text-gray-400">{t.refuels.pricePerLiter}:</span>
              <span className="text-secondary font-semibold">
                {renderSvgFuelPrice(data.pricePerLiter)}
              </span>
            </p>
            <p className="flex justify-between gap-4">
              <span className="text-gray-400">{t.refuels.distance}:</span>
              <span className="text-secondary font-semibold">
                {data.kilometers_since_last_refuel} km
              </span>
            </p>
            <div className="border-t pt-2 mt-2">
              <p className="flex justify-between gap-4">
                <span className="text-gray-400">{t.refuels.costPer100km}:</span>
                <span className="text-blue-600 dark:text-blue-400 font-semibold">
                  {formatCost(data.costPer100km)} €
                </span>
              </p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Calculate statistics
  const { minCost, maxCost, avgCost, costRange } = useMemo(() => {
    const costs = chartData.map((item) => item.costPer100km);
    const min = Math.min(...costs);
    const max = Math.max(...costs);
    const avg = costs.reduce((sum, c) => sum + c, 0) / costs.length;
    return {
      minCost: min,
      maxCost: max,
      avgCost: avg,
      costRange: max - min,
    };
  }, [chartData]);

  return (
    <Panel title={t.refuels.costPer100km}>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          key={chartKey}
          data={chartData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 20,
          }}
        >
          <CartesianGrid {...gridConfig} />
          <XAxis
            dataKey="displayDate"
            stroke={chartTheme.axis}
            {...axisConfig.xAxis}
          />
          <YAxis
            stroke={chartTheme.axis}
            tickFormatter={(value) => `${value.toFixed(2)} €`}
            {...axisConfig.yAxis}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar
            dataKey="costPer100km"
            fill={chartTheme.primaryLine}
            name={t.refuels.costPer100km}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>

      <GridLayout variant="stats" className="mt-4 text-sm">
        <SummaryCard
          title={t.refuels.minCost}
          value={{
            value: minCost,
            formatter: (value) => formatCost(value),
            unit: "€/100km",
          }}
          icon={
            <TrendingDownIcon className="icon-lg text-green-600 dark:text-green-400" />
          }
          iconBgColor="green"
        />

        <SummaryCard
          title={t.refuels.maxCost}
          value={{
            value: maxCost,
            formatter: (value) => formatCost(value),
            unit: "€/100km",
          }}
          icon={
            <TrendingUpIcon className="icon-lg text-red-600 dark:text-red-400" />
          }
          iconBgColor="red"
        />

        <SummaryCard
          title={t.refuels.avgCost}
          value={{
            value: avgCost,
            formatter: (value) => formatCost(value),
            unit: "€/100km",
          }}
          icon={
            <BarChartIcon className="icon-lg text-yellow-600 dark:text-yellow-400" />
          }
          iconBgColor="yellow"
        />

        <SummaryCard
          title={t.refuels.costRange}
          value={{
            value: costRange,
            formatter: (value) => formatCost(value),
            unit: "€/100km",
          }}
          icon={
            <SwapVertIcon className="icon-lg text-purple-600 dark:text-purple-400" />
          }
          iconBgColor="purple"
        />
      </GridLayout>
    </Panel>
  );
}
