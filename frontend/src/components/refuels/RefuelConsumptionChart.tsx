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
import { axisConfig, useGridConfig } from "../../lib/chartConfig";

interface RefuelDataForChart {
  timestamp: string;
  price: number;
  amount: number;
  kilometers_since_last_refuel: number;
  estimated_fuel_consumption: number;
  notes?: string;
}

interface RefuelConsumptionChartProps {
  refuelData: RefuelDataForChart[];
}

export default function RefuelConsumptionChart({
  refuelData,
}: RefuelConsumptionChartProps) {
  const { t } = useTranslation();
  const { formatDate, formatNumber } = useLocalization();
  const chartTheme = useChartTheme();
  const gridConfig = useGridConfig();

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

  // Process data and calculate actual consumption
  const chartData = refuelData
    .filter((item) => item.kilometers_since_last_refuel > 0 && item.amount > 0)
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    )
    .map((item) => {
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
        actualConsumption: parseFloat(actualConsumption.toFixed(2)),
        estimatedConsumption: parseFloat(
          item.estimated_fuel_consumption.toFixed(2),
        ),
        difference: parseFloat(
          (actualConsumption - item.estimated_fuel_consumption).toFixed(2),
        ),
      };
    });

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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const date = new Date(label);
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
              <span className="text-gray-400">{t.refuels.estimated}:</span>
              <span className="text-blue-600 dark:text-blue-400 font-semibold">
                {formatConsumption(data.estimatedConsumption)} L
              </span>
            </p>
            <p className="flex justify-between gap-4">
              <span className="text-gray-400">{t.refuels.actual}:</span>
              <span className="text-green-600 dark:text-green-400 font-semibold">
                {formatConsumption(data.actualConsumption)} L
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
                {formatConsumption(Math.abs(data.difference))} L
              </span>
            </p>
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
        </div>
      );
    }
    return null;
  };

  // Calculate statistics
  const avgActual =
    chartData.reduce((sum, item) => sum + item.actualConsumption, 0) /
    chartData.length;
  const avgEstimated =
    chartData.reduce((sum, item) => sum + item.estimatedConsumption, 0) /
    chartData.length;
  const avgDifference = avgActual - avgEstimated;
  const accurateEntries = chartData.filter(
    (item) => Math.abs(item.difference) <= 0.5,
  ).length;
  const accuracyPercentage = (accurateEntries / chartData.length) * 100;

  return (
    <Panel title={t.refuels.fuelConsumptionEstimatedVsActual}>
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
            dot={{
              fill: chartTheme.primaryDot,
              strokeWidth: 2,
              r: 3,
            }}
            name={t.refuels.estimatedConsumption}
          />
          <Line
            type="monotone"
            dataKey="actualConsumption"
            stroke={chartTheme.secondaryLine}
            strokeWidth={3}
            dot={{
              fill: chartTheme.secondaryDot,
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

      <GridLayout variant="stats" className="mt-4 text-sm">
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
    </Panel>
  );
}
