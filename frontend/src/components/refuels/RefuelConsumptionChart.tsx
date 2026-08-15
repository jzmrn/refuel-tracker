import React, { useMemo, useState } from "react";
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
import SummaryCard from "../common/SummaryCard";
import Panel from "../common/Panel";
import { GridLayout } from "../common/GridLayout";
import { MobileChartCard } from "../common/MobileChartCard";
import BarChartIcon from "@mui/icons-material/BarChart";
import NumbersIcon from "@mui/icons-material/Numbers";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import {
  useTranslation,
  useLocalization,
} from "../../lib/i18n/LanguageContext";
import { useChartTheme } from "../../lib/theme";
import { axisConfig, useGridConfig, useChartKey } from "../../lib/chartConfig";
import { RefuelMetric } from "../../lib/api";
import { combineRefuelEntries } from "../../lib/refuelCombination";
import { useIsMobile } from "../../lib/hooks/useIsMobile";

interface RefuelConsumptionChartProps {
  refuelData: RefuelMetric[];
}

export default function RefuelConsumptionChart({
  refuelData,
}: RefuelConsumptionChartProps) {
  const { t } = useTranslation();
  const { formatDate, formatNumber } = useLocalization();
  const chartTheme = useChartTheme();
  const gridConfig = useGridConfig();
  const chartKey = useChartKey(refuelData);
  const isMobile = useIsMobile();
  const [selectedPoint, setSelectedPoint] = useState<any>(null);

  if (!refuelData || refuelData.length === 0) {
    return (
      <Panel title={t.refuels.fuelConsumptionEstimatedVsActual}>
        <div className="empty-state">
          <p>{t.refuels.noConsumptionDataAvailable}</p>
          <p className="text-sm mt-1">
            {t.refuels.addMoreRefuelEntriesToSeeConsumptionTrends}
          </p>
        </div>
      </Panel>
    );
  }

  // Process data: show ALL entries with estimated consumption,
  // actual consumption only at closing full fills (using combined value for groups)
  const chartData = useMemo(() => {
    const groups = combineRefuelEntries(refuelData);

    // Build a lookup: timestamp -> { isAnchor, isCombined, combinedConsumption, group }
    const entryInfo = new Map<
      string,
      {
        isAnchor: boolean;
        isCombined: boolean;
        isComplete: boolean;
        combinedConsumption: number;
        totalLiters: number;
        totalKilometers: number;
      }
    >();

    for (const group of groups) {
      const anchor = group.entries[group.entries.length - 1];
      for (const entry of group.entries) {
        const isAnchor = entry.timestamp === anchor.timestamp;
        entryInfo.set(entry.timestamp, {
          isAnchor,
          isCombined: group.isCombined,
          isComplete: group.isComplete,
          combinedConsumption: group.combinedConsumption,
          totalLiters: group.totalLiters,
          totalKilometers: group.totalKilometers,
        });
      }
    }

    // Sort all entries by timestamp
    const sorted = [...refuelData].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    return sorted
      .filter(
        (entry) => entry.amount > 0 && entry.kilometers_since_last_refuel > 0,
      )
      .map((entry) => {
        const info = entryInfo.get(entry.timestamp);
        const isAnchor = info?.isAnchor ?? false;
        const isCombined = info?.isCombined ?? false;
        const isComplete = info?.isComplete ?? false;
        const isFull = entry.is_full_tank !== false;

        // Actual consumption only shown at closing full fills
        let actualConsumption: number | null = null;
        if (isAnchor && isComplete) {
          actualConsumption = parseFloat(info!.combinedConsumption.toFixed(2));
        }

        const estimatedConsumption = entry.estimated_fuel_consumption ?? 0;

        return {
          timestamp: entry.timestamp,
          timestampMs: new Date(entry.timestamp).getTime(),
          displayDate: formatDate(new Date(entry.timestamp), {
            month: "short",
            day: "numeric",
            year: "2-digit",
          }),
          actualConsumption,
          estimatedConsumption: parseFloat(estimatedConsumption.toFixed(2)),
          difference:
            actualConsumption !== null
              ? parseFloat(
                  (actualConsumption - estimatedConsumption).toFixed(2),
                )
              : null,
          isFullTank: isFull,
          isCombined: isAnchor && isCombined,
          isPartialInGroup: !isFull && isCombined,
          amount: isAnchor ? info?.totalLiters ?? entry.amount : entry.amount,
          kilometers_since_last_refuel: isAnchor
            ? info?.totalKilometers ?? entry.kilometers_since_last_refuel
            : entry.kilometers_since_last_refuel,
        };
      });
  }, [refuelData, formatDate]);

  if (chartData.length === 0) {
    return (
      <Panel title={t.refuels.fuelConsumptionEstimatedVsActual}>
        <div className="empty-state">
          <p>{t.refuels.noValidConsumptionDataAvailable}</p>
          <p className="text-sm mt-1">
            {t.refuels.makeSureEntriesHaveKilometersAndFuelAmount}
          </p>
        </div>
      </Panel>
    );
  }

  const formatConsumption = (value: number) => `${value.toFixed(1)}`;

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
            <span className="text-gray-400">{t.refuels.estimated}:</span>
            <span className="text-blue-600 dark:text-blue-400 font-semibold">
              {formatConsumption(data.estimatedConsumption)} L/100km
            </span>
          </p>
          {data.actualConsumption !== null && (
            <>
              <p className="flex justify-between gap-4">
                <span className="text-gray-400">{t.refuels.actual}:</span>
                <span className="text-green-600 dark:text-green-400 font-semibold">
                  {formatConsumption(data.actualConsumption)} L/100km
                </span>
              </p>
              <p className="flex justify-between gap-4">
                <span className="text-gray-400">{t.refuels.difference}:</span>
                <span
                  className={`font-semibold ${
                    data.difference > 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-green-600 dark:text-green-400"
                  }`}
                >
                  {data.difference > 0 ? "+" : "-"}
                  {formatConsumption(Math.abs(data.difference))} L/100km
                </span>
              </p>
            </>
          )}
          <div className="border-t pt-2 mt-2 space-y-1">
            <p className="flex justify-between gap-4">
              <span className="text-gray-400">{t.refuels.distance}:</span>
              <span className="text-secondary font-semibold">
                {data.kilometers_since_last_refuel} km
              </span>
            </p>
            <p className="flex justify-between gap-4">
              <span className="text-gray-400">{t.refuels.fuel}:</span>
              <span className="text-secondary font-semibold">
                {formatNumber(data.amount, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                L
              </span>
            </p>
          </div>
        </div>
      </>
    );
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (isMobile || !active || !payload || !payload.length) return null;
    return (
      <div className="panel">{renderTooltipContent(payload[0].payload)}</div>
    );
  };

  // Calculate statistics (only from full fills for accuracy)
  const fullFillData = chartData.filter(
    (item) => item.isFullTank && item.actualConsumption !== null,
  );
  const statsData = fullFillData.length > 0 ? fullFillData : chartData;

  const avgActual =
    statsData.reduce((sum, item) => sum + (item.actualConsumption ?? 0), 0) /
    statsData.length;
  const avgEstimated =
    statsData.reduce((sum, item) => sum + item.estimatedConsumption, 0) /
    statsData.length;
  const avgDifference = avgActual - avgEstimated;
  const accurateEntries = statsData.filter(
    (item) => item.difference !== null && Math.abs(item.difference) <= 0.5,
  ).length;
  const accuracyPercentage = (accurateEntries / statsData.length) * 100;

  return (
    <Panel title={t.refuels.fuelConsumptionEstimatedVsActual}>
      <GridLayout variant="stats" className="mb-4 text-sm">
        <SummaryCard
          title={t.refuels.avgActual}
          value={{
            value: avgActual,
            formatter: (value) => formatConsumption(value),
            unit: "L/100km",
          }}
          icon={
            <BarChartIcon className="icon-lg text-green-600 dark:text-green-400" />
          }
          iconBgColor="green"
        />

        <SummaryCard
          title={t.refuels.avgEstimated}
          value={{
            value: avgEstimated,
            formatter: (value) => formatConsumption(value),
            unit: "L/100km",
          }}
          icon={
            <NumbersIcon className="icon-lg text-blue-600 dark:text-blue-400" />
          }
          iconBgColor="blue"
        />

        <SummaryCard
          title={t.refuels.avgDifference}
          value={{
            value: avgDifference,
            formatter: (value) =>
              `${value > 0 ? "+" : ""}${formatConsumption(Math.abs(value))}`,
            unit: "L/100km",
          }}
          icon={
            avgDifference > 0 ? (
              <TrendingUpIcon className="icon-lg text-red-600 dark:text-red-400" />
            ) : (
              <TrendingDownIcon className="icon-lg text-green-600 dark:text-green-400" />
            )
          }
          iconBgColor={avgDifference > 0 ? "red" : "green"}
        />

        <SummaryCard
          title={t.refuels.accuracy}
          value={{
            value: accuracyPercentage,
            formatter: (value) => `${value.toFixed(0)}`,
            unit: "%",
          }}
          icon={
            <CheckCircleOutlineIcon className="icon-lg text-purple-600 dark:text-purple-400" />
          }
          iconBgColor="purple"
        />
      </GridLayout>

      <ResponsiveContainer width="100%" height={350}>
        <LineChart
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
          <CartesianGrid {...gridConfig} />
          <XAxis
            type="number"
            dataKey="timestampMs"
            scale="time"
            domain={["dataMin", "dataMax"]}
            stroke={chartTheme.axis}
            tickFormatter={(value) => {
              const date = new Date(value);
              return formatDate(date, {
                month: "short",
                day: "numeric",
                year: "2-digit",
              });
            }}
            {...axisConfig.xAxis}
          />
          <YAxis
            domain={["dataMin", "dataMax"]}
            stroke={chartTheme.axis}
            tickFormatter={(value) => `${value.toFixed(1)}`}
            {...axisConfig.yAxis}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="estimatedConsumption"
            stroke={chartTheme.primaryLine}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={(props: any) => {
              const { cx, cy, payload } = props;
              if (cx == null || cy == null) return <></>;
              const isPartial = !payload?.isFullTank;
              const color = isPartial ? "#f59e0b" : chartTheme.primaryDot;
              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={3}
                  fill={color}
                  stroke={color}
                  strokeWidth={2}
                />
              );
            }}
            name={t.refuels.estimatedConsumption}
          />
          <Line
            type="monotone"
            dataKey="actualConsumption"
            stroke={chartTheme.secondaryLine}
            strokeWidth={3}
            connectNulls={true}
            dot={{
              fill: chartTheme.secondaryDot,
              stroke: chartTheme.secondaryDot,
              strokeWidth: 2,
              r: 4,
            }}
            activeDot={{
              r: 6,
              fill: chartTheme.secondaryActiveDot,
              strokeWidth: 2,
              stroke: chartTheme.activeDotStroke,
            }}
            name={t.refuels.actualConsumptionChart}
          />
        </LineChart>
      </ResponsiveContainer>

      {isMobile && (
        <MobileChartCard>
          {renderTooltipContent(selectedPoint ?? chartData[0])}
        </MobileChartCard>
      )}
    </Panel>
  );
}
