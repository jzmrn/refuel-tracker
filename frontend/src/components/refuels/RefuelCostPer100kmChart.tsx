import React, { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import SummaryCard from "../common/SummaryCard";
import Panel from "../common/Panel";
import { GridLayout } from "../common/GridLayout";
import { MobileChartCard } from "../common/MobileChartCard";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import BarChartIcon from "@mui/icons-material/BarChart";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import {
  useTranslation,
  useLocalization,
} from "../../lib/i18n/LanguageContext";
import { useChartTheme } from "../../lib/theme";
import {
  axisConfig,
  chartClassNames,
  useGridConfig,
  useChartKey,
} from "../../lib/chartConfig";

import { RefuelMetric } from "../../lib/api";
import { getCombinedChartData } from "../../lib/refuelCombination";
import { useIsMobile } from "../../lib/hooks/useIsMobile";

interface RefuelCostPer100kmChartProps {
  refuelData: RefuelMetric[];
}

export default function RefuelCostPer100kmChart({
  refuelData,
}: RefuelCostPer100kmChartProps) {
  const { t } = useTranslation();
  const { formatDate } = useLocalization();
  const chartTheme = useChartTheme();
  const gridConfig = useGridConfig();
  const chartKey = useChartKey(refuelData);
  const isMobile = useIsMobile();
  const [selectedPoint, setSelectedPoint] = useState<any>(null);

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

  // Use combined chart data for accurate cost/100km
  const chartData = useMemo(() => {
    return getCombinedChartData(refuelData)
      .filter(
        (item) =>
          item.totalLiters > 0 &&
          item.totalKilometers > 0 &&
          item.averagePricePerLiter > 0,
      )
      .map((item) => ({
        ...item,
        displayDate: formatDate(new Date(item.timestamp), {
          month: "short",
          day: "numeric",
          year: "2-digit",
        }),
      }));
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

  const renderTooltipContent = (data: any) => {
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
      <>
        <div className="mb-2">
          <p className="text-primary font-medium">{formattedDate}</p>
          <p className="text-sm text-secondary">
            {formattedTime}
            {data.isCombined && (
              <span className="text-amber-500 ml-1">
                {t.refuels.combinedLabel}
              </span>
            )}
          </p>
        </div>
        <div className="space-y-1 text-sm">
          <p className="flex justify-between gap-4">
            <span className="text-gray-400">{t.refuels.fuel}:</span>
            <span className="text-secondary font-semibold">
              {data.totalLiters.toFixed(2)} L
            </span>
          </p>
          <p className="flex justify-between gap-4">
            <span className="text-gray-400">{t.refuels.totalCost}:</span>
            <span className="text-secondary font-semibold">
              {formatCost(data.totalCost)} €
            </span>
          </p>
          <p className="flex justify-between gap-4">
            <span className="text-gray-400">{t.refuels.distance}:</span>
            <span className="text-secondary font-semibold">
              {data.totalKilometers.toFixed(0)} km
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
      </>
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (isMobile || !active || !payload || !payload.length) return null;
    return (
      <div className="panel">{renderTooltipContent(payload[0].payload)}</div>
    );
  };

  // Determine which bar types exist in the data for the legend
  const hasCombined = chartData.some((d) => d.isCombined);
  const hasPartial = chartData.some((d) => !d.isComplete && !d.isCombined);

  const renderCustomLegend = () => (
    <div className={chartClassNames.legendContainer}>
      <div className={chartClassNames.legendItem}>
        <span
          className={chartClassNames.legendSwatch}
          style={{ backgroundColor: chartTheme.primaryLine }}
        />
        <span className={chartClassNames.legendText}>
          {t.refuels.costPer100km}
        </span>
      </div>
      {hasCombined && (
        <div className={chartClassNames.legendItem}>
          <span
            className={`${chartClassNames.legendSwatch} overflow-hidden relative`}
          >
            <svg width="12" height="12" className="absolute inset-0">
              <defs>
                <pattern
                  id="legend-stripe"
                  patternUnits="userSpaceOnUse"
                  width="6"
                  height="6"
                  patternTransform="rotate(45)"
                >
                  <rect width="3" height="6" fill={chartTheme.primaryLine} />
                  <rect x="3" width="3" height="6" fill="#f59e0b" />
                </pattern>
              </defs>
              <rect width="12" height="12" fill="url(#legend-stripe)" />
            </svg>
          </span>
          <span className={chartClassNames.legendText}>
            {t.refuels.combinedEntries}
          </span>
        </div>
      )}
      {hasPartial && (
        <div className={chartClassNames.legendItem}>
          <span
            className={chartClassNames.legendSwatch}
            style={{ backgroundColor: "#f59e0b" }}
          />
          <span className={chartClassNames.legendText}>
            {t.refuels.partialFill}
          </span>
        </div>
      )}
    </div>
  );

  // Calculate statistics from complete data only
  const { minCost, maxCost, avgCost, costRange } = useMemo(() => {
    const completeData = chartData.filter((item) => item.isComplete);
    const costs =
      completeData.length > 0
        ? completeData.map((item) => item.costPer100km)
        : chartData.map((item) => item.costPer100km);
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
      <GridLayout variant="stats" className="mb-4 text-sm">
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
          onMouseMove={(state: any) => {
            if (isMobile && state.activePayload?.[0]?.payload) {
              setSelectedPoint(state.activePayload[0].payload);
            }
          }}
          onClick={(state: any) => {
            if (isMobile && state?.activePayload?.[0]?.payload) {
              setSelectedPoint(state.activePayload[0].payload);
            }
          }}
        >
          <defs>
            <pattern
              id="combined-stripe"
              patternUnits="userSpaceOnUse"
              width="8"
              height="8"
              patternTransform="rotate(45)"
            >
              <rect width="4" height="8" fill={chartTheme.primaryLine} />
              <rect x="4" width="4" height="8" fill="#f59e0b" />
            </pattern>
          </defs>
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
          <Legend content={renderCustomLegend} />
          <Bar
            dataKey="costPer100km"
            name={t.refuels.costPer100km}
            fill={chartTheme.primaryLine}
            radius={[4, 4, 0, 0]}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  entry.isCombined
                    ? "url(#combined-stripe)"
                    : !entry.isComplete
                    ? "#f59e0b"
                    : chartTheme.primaryLine
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {isMobile && (
        <MobileChartCard>
          {renderTooltipContent(selectedPoint ?? chartData[0])}
        </MobileChartCard>
      )}
    </Panel>
  );
}
