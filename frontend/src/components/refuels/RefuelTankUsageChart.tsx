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
import ChartTooltipHeader, {
  formatChartDateLabel,
} from "../common/ChartTooltipHeader";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import BarChartIcon from "@mui/icons-material/BarChart";
import FilterListIcon from "@mui/icons-material/FilterList";
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
import { getTankUsageChartData } from "../../lib/refuelCombination";
import { useIsMobile } from "../../lib/hooks/useIsMobile";

interface RefuelTankUsageChartProps {
  refuelData: RefuelMetric[];
  fuelTankSize?: number;
}

export default function RefuelTankUsageChart({
  refuelData,
  fuelTankSize,
}: RefuelTankUsageChartProps) {
  const { t } = useTranslation();
  const { formatDate, formatNumber } = useLocalization();
  const chartTheme = useChartTheme();
  const gridConfig = useGridConfig();
  const chartKey = useChartKey(refuelData);
  const isMobile = useIsMobile();
  const [selectedPoint, setSelectedPoint] = useState<any>(null);

  const chartData = useMemo(() => {
    if (!refuelData || refuelData.length === 0 || !fuelTankSize) return [];
    return getTankUsageChartData(refuelData, fuelTankSize)
      .filter((item) => item.totalLiters > 0)
      .map((item) => ({
        ...item,
        displayDate: formatChartDateLabel(item.entryTimestamps, formatDate),
      }));
  }, [refuelData, fuelTankSize, formatDate]);

  const stats = useMemo(() => {
    const completeData = chartData.filter((item) => item.isComplete);
    const source = completeData.length > 0 ? completeData : chartData;
    const values = source.map((item) => item.tankUsage);
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const median =
      sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((sum, v) => sum + v, 0) / values.length,
      median,
    };
  }, [chartData]);

  if (!fuelTankSize || fuelTankSize <= 0) {
    return (
      <Panel title={t.refuels.tankUsage}>
        <div className="empty-state">
          <p>{t.refuels.noTankUsageDataAvailable}</p>
          <p className="text-sm mt-1">{t.refuels.tankSizeRequiredForUsage}</p>
        </div>
      </Panel>
    );
  }

  if (chartData.length === 0 || !stats) {
    return (
      <Panel title={t.refuels.tankUsage}>
        <div className="empty-state">
          <p>{t.refuels.noTankUsageDataAvailable}</p>
          <p className="text-sm mt-1">
            {t.refuels.addMoreRefuelEntriesToSeeTankUsageTrends}
          </p>
        </div>
      </Panel>
    );
  }

  const formatPercentage = (value: number) => `${value.toFixed(1)}`;
  const formatLiters = (value: number) =>
    formatNumber(value, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const renderTooltipContent = (data: any) => {
    return (
      <>
        <ChartTooltipHeader
          timestamps={data.entryTimestamps ?? [data.timestamp]}
        />
        <div className="space-y-1 text-sm">
          <p className="flex justify-between gap-4">
            <span className="text-gray-400">{t.refuels.fuel}:</span>
            <span className="text-secondary font-semibold">
              {formatLiters(data.totalLiters)} L
            </span>
          </p>
          {data.isCombined && (
            <p className="flex justify-between gap-4">
              <span className="text-gray-400">{t.refuels.avgPerRefuel}:</span>
              <span className="text-secondary font-semibold">
                {formatLiters(data.averageLiters)} L
              </span>
            </p>
          )}
          <div className="border-t pt-2 mt-2">
            <p className="flex justify-between gap-4">
              <span className="text-gray-400">{t.refuels.tankUsage}:</span>
              <span className="text-blue-600 dark:text-blue-400 font-semibold">
                {formatPercentage(data.tankUsage)} %
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
          {t.refuels.tankUsage}
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
                  id="tank-usage-legend-stripe"
                  patternUnits="userSpaceOnUse"
                  width="6"
                  height="6"
                  patternTransform="rotate(45)"
                >
                  <rect width="3" height="6" fill={chartTheme.primaryLine} />
                  <rect x="3" width="3" height="6" fill="#f59e0b" />
                </pattern>
              </defs>
              <rect
                width="12"
                height="12"
                fill="url(#tank-usage-legend-stripe)"
              />
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

  return (
    <Panel title={t.refuels.tankUsage}>
      <GridLayout variant="stats" className="mb-4 text-sm">
        <SummaryCard
          title={t.refuels.minTankUsage}
          value={{
            value: stats.min,
            formatter: (value) => formatPercentage(value),
            unit: "%",
          }}
          icon={
            <TrendingDownIcon className="icon-lg text-green-600 dark:text-green-400" />
          }
          iconBgColor="green"
        />

        <SummaryCard
          title={t.refuels.maxTankUsage}
          value={{
            value: stats.max,
            formatter: (value) => formatPercentage(value),
            unit: "%",
          }}
          icon={
            <TrendingUpIcon className="icon-lg text-red-600 dark:text-red-400" />
          }
          iconBgColor="red"
        />

        <SummaryCard
          title={t.refuels.avgTankUsage}
          value={{
            value: stats.avg,
            formatter: (value) => formatPercentage(value),
            unit: "%",
          }}
          icon={
            <BarChartIcon className="icon-lg text-yellow-600 dark:text-yellow-400" />
          }
          iconBgColor="yellow"
        />

        <SummaryCard
          title={t.refuels.medianTankUsage}
          value={{
            value: stats.median,
            formatter: (value) => formatPercentage(value),
            unit: "%",
          }}
          icon={
            <FilterListIcon className="icon-lg text-purple-600 dark:text-purple-400" />
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
              id="tank-usage-combined-stripe"
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
            tickFormatter={(value) => `${value.toFixed(0)} %`}
            {...axisConfig.yAxis}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend content={renderCustomLegend} />
          <Bar
            dataKey="tankUsage"
            name={t.refuels.tankUsage}
            fill={chartTheme.primaryLine}
            radius={[4, 4, 0, 0]}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  entry.isCombined
                    ? "url(#tank-usage-combined-stripe)"
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
