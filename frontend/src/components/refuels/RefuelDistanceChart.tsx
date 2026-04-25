import React from "react";
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
import LocalGasStationIcon from "@mui/icons-material/LocalGasStation";
import {
  useTranslation,
  useLocalization,
} from "../../lib/i18n/LanguageContext";
import { useChartTheme } from "../../lib/theme";
import { axisConfig, useGridConfig, useChartKey } from "../../lib/chartConfig";

interface RefuelDataForChart {
  timestamp: string;
  price: number;
  amount: number;
  kilometers_since_last_refuel: number;
  estimated_fuel_consumption: number;
  notes?: string;
  remaining_range_km?: number | null;
}

interface RefuelDistanceChartProps {
  refuelData: RefuelDataForChart[];
  fuelTankSize?: number;
}

export default function RefuelDistanceChart({
  refuelData,
  fuelTankSize,
}: RefuelDistanceChartProps) {
  const { t } = useTranslation();
  const { formatDate, formatNumber } = useLocalization();
  const chartTheme = useChartTheme();
  const gridConfig = useGridConfig();
  const chartKey = useChartKey(refuelData);

  if (!refuelData || refuelData.length === 0) {
    return (
      <Panel title={t.refuels.distanceSinceLastRefuel}>
        <div className="empty-state">
          <p>{t.refuels.noDistanceDataAvailable}</p>
          <p className="text-sm mt-1">
            {t.refuels.addMoreRefuelEntriesToSeeDistanceTrends}
          </p>
        </div>
      </Panel>
    );
  }

  // Process data and filter entries with valid distance
  const chartData = refuelData
    .filter((item) => item.kilometers_since_last_refuel > 0)
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    )
    .map((item) => ({
      ...item,
      timestampMs: new Date(item.timestamp).getTime(),
      displayDate: formatDate(new Date(item.timestamp), {
        month: "short",
        day: "numeric",
        year: "2-digit",
      }),
      distance: item.kilometers_since_last_refuel,
      remainingRange: item.remaining_range_km ?? 0,
    }));

  if (chartData.length === 0) {
    return (
      <Panel title={t.refuels.distanceSinceLastRefuel}>
        <div className="empty-state">
          <p>{t.refuels.noValidDistanceDataAvailable}</p>
          <p className="text-sm mt-1">
            {t.refuels.makeSureEntriesHaveKilometersData}
          </p>
        </div>
      </Panel>
    );
  }

  const hasRemainingRange = chartData.some((item) => item.remainingRange > 0);

  const formatDistance = (value: number) => `${value.toFixed(0)}`;

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
      const totalRange = data.distance + data.remainingRange;
      return (
        <div className="panel">
          <div className="mb-2">
            <p className="text-primary font-medium">{formattedDate}</p>
            <p className="text-sm text-secondary">{formattedTime}</p>
          </div>
          <div className="space-y-1 text-sm">
            <p className="flex justify-between gap-4">
              <span className="text-gray-400">{t.refuels.distance}:</span>
              <span className="text-blue-600 dark:text-blue-400 font-semibold">
                {formatDistance(data.distance)} km
              </span>
            </p>
            {data.remainingRange > 0 && (
              <>
                <p className="flex justify-between gap-4">
                  <span className="text-gray-400">
                    {t.refuels.remainingRange}:
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    {formatDistance(data.remainingRange)} km
                  </span>
                </p>
                <hr className="border-gray-200 dark:border-gray-600 my-1" />
                <p className="flex justify-between gap-4">
                  <span className="text-gray-400">
                    {t.refuels.theoreticalMaxRange}:
                  </span>
                  <span className="font-semibold">
                    {formatDistance(totalRange)} km
                  </span>
                </p>
              </>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Calculate statistics
  const distances = chartData.map((item) => item.distance);
  const minDistance = Math.min(...distances);
  const maxDistance = Math.max(...distances);
  const avgDistance =
    distances.reduce((sum, d) => sum + d, 0) / distances.length;

  // Calculate average tank usage
  const consumptions = chartData
    .filter((item) => item.amount > 0 && item.kilometers_since_last_refuel > 0)
    .map((item) => (item.amount / item.kilometers_since_last_refuel) * 100);
  const avgConsumption =
    consumptions.length > 0
      ? consumptions.reduce((sum, c) => sum + c, 0) / consumptions.length
      : 0;

  const avgTankUsage =
    fuelTankSize && fuelTankSize > 0
      ? ((avgDistance * avgConsumption) / (fuelTankSize * 100)) * 100
      : null;

  return (
    <Panel title={t.refuels.distanceSinceLastRefuel}>
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
            tickFormatter={(value) => `${value.toFixed(0)} km`}
            {...axisConfig.yAxis}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar
            dataKey="distance"
            stackId="range"
            fill={chartTheme.primaryLine}
            name={t.refuels.distance}
            radius={hasRemainingRange ? [0, 0, 0, 0] : [4, 4, 0, 0]}
          />
          {hasRemainingRange && (
            <Bar
              dataKey="remainingRange"
              stackId="range"
              fill={chartTheme.secondaryLine}
              fillOpacity={0.5}
              name={t.refuels.remainingRange}
              radius={[4, 4, 0, 0]}
            />
          )}
        </BarChart>
      </ResponsiveContainer>

      <GridLayout variant="stats" className="mt-4 text-sm">
        <SummaryCard
          title={t.refuels.minDistance}
          value={{
            value: minDistance,
            formatter: (value) => formatDistance(value),
            unit: "km",
          }}
          icon={
            <TrendingDownIcon className="icon-lg text-green-600 dark:text-green-400" />
          }
          iconBgColor="green"
        />

        <SummaryCard
          title={t.refuels.maxDistance}
          value={{
            value: maxDistance,
            formatter: (value) => formatDistance(value),
            unit: "km",
          }}
          icon={
            <TrendingUpIcon className="icon-lg text-red-600 dark:text-red-400" />
          }
          iconBgColor="red"
        />

        <SummaryCard
          title={t.refuels.avgDistance}
          value={{
            value: avgDistance,
            formatter: (value) => formatDistance(value),
            unit: "km",
          }}
          icon={
            <BarChartIcon className="icon-lg text-yellow-600 dark:text-yellow-400" />
          }
          iconBgColor="yellow"
        />

        {avgTankUsage !== null && (
          <SummaryCard
            title={t.refuels.avgTankUsage}
            value={{
              value: avgTankUsage,
              formatter: (value) => value.toFixed(1),
              unit: "%",
            }}
            icon={
              <LocalGasStationIcon className="icon-lg text-purple-600 dark:text-purple-400" />
            }
            iconBgColor="purple"
          />
        )}
      </GridLayout>
    </Panel>
  );
}
