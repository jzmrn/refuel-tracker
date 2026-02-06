import React from "react";
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
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import BarChartIcon from "@mui/icons-material/BarChart";
import LocalGasStationIcon from "@mui/icons-material/LocalGasStation";
import {
  useTranslation,
  useLocalization,
} from "../../lib/i18n/LanguageContext";
import { useChartTheme } from "../../lib/theme";
import { axisConfig, useGridConfig } from "../../lib/chartConfig";

interface RefuelDataForChart {
  timestamp: string;
  price: number;
  amount: number;
  kilometers_since_last_refuel: number;
  estimated_fuel_consumption: number;
  notes?: string;
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

  const formatDistance = (value: number) => `${value.toFixed(0)}`;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const date = new Date(label);
      const formattedDate = formatDate(date, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const formattedTime = formatDate(date, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
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
            <p className="flex justify-between gap-4">
              <span className="text-gray-400">{t.refuels.fuel}:</span>
              <span className="text-green-600 dark:text-green-400 font-semibold">
                {formatNumber(data.amount, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                L
              </span>
            </p>
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
  // Formula: (avgDistance * avgConsumption) / (fuelTankSize * 100)
  // This gives us the percentage of tank used on average
  const consumptions = chartData
    .filter((item) => item.amount > 0 && item.kilometers_since_last_refuel > 0)
    .map((item) => (item.amount / item.kilometers_since_last_refuel) * 100);
  const avgConsumption =
    consumptions.length > 0
      ? consumptions.reduce((sum, c) => sum + c, 0) / consumptions.length
      : 0;

  // Average tank usage = (avgDistance * avgConsumption / 100) / fuelTankSize * 100
  // Simplified: (avgDistance * avgConsumption) / fuelTankSize
  const avgTankUsage =
    fuelTankSize && fuelTankSize > 0
      ? ((avgDistance * avgConsumption) / (fuelTankSize * 100)) * 100
      : null;

  return (
    <Panel title={t.refuels.distanceSinceLastRefuel}>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart
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
            tickFormatter={(value) => `${value.toFixed(0)}`}
            {...axisConfig.yAxis}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="distance"
            stroke={chartTheme.primaryLine}
            strokeWidth={3}
            dot={{
              fill: chartTheme.primaryDot,
              strokeWidth: 2,
              r: 4,
            }}
            activeDot={{
              r: 6,
              fill: chartTheme.primaryDot,
              strokeWidth: 2,
              stroke: chartTheme.activeDotStroke,
            }}
            name={t.refuels.distanceKm}
          />
        </LineChart>
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
