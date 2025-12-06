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

  if (!refuelData || refuelData.length === 0) {
    return (
      <div className="mt-6">
        <h4 className="heading-4 mb-3">
          {t.refuels.fuelConsumptionEstimatedVsActual}
        </h4>
        <div className="empty-state">
          <p>{t.refuels.noConsumptionDataAvailable}</p>
          <p className="text-sm mt-1">
            {t.refuels.addMoreRefuelEntriesToSeeConsumptionTrends}
          </p>
        </div>
      </div>
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
      <div className="mt-6">
        <h4 className="text-md font-semibold mb-3 text-gray-700">
          {t.refuels.fuelConsumptionEstimatedVsActual}
        </h4>
        <div className="bg-gray-50 p-8 rounded-lg text-center text-gray-500">
          <p>{t.refuels.noValidConsumptionDataAvailable}</p>
          <p className="text-sm mt-1">
            {t.refuels.makeSureEntriesHaveKilometersAndFuelAmount}
          </p>
        </div>
      </div>
    );
  }

  const formatConsumption = (value: number) => `${value.toFixed(1)}`;

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
            <p className="text-blue-600">
              <span className="font-medium">{t.refuels.estimated}:</span>{" "}
              {formatConsumption(data.estimatedConsumption)}
            </p>
            <p className="text-green-600">
              <span className="font-medium">{t.refuels.actual}:</span>{" "}
              {formatConsumption(data.actualConsumption)}
            </p>
            <p
              className={`${
                data.difference > 0 ? "text-red-600" : "text-green-600"
              }`}
            >
              <span className="font-medium">{t.refuels.difference}:</span>{" "}
              {data.difference > 0 ? "+" : ""}
              {formatConsumption(Math.abs(data.difference))}
            </p>
            <div className="border-t pt-2 mt-2">
              <p className="text-secondary">
                <span className="font-medium">{t.refuels.distance}:</span>{" "}
                {data.kilometers_since_last_refuel} km
              </p>
              <p className="text-secondary">
                <span className="font-medium">{t.refuels.fuel}:</span>{" "}
                {formatNumber(data.amount, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                L
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

  // Calculate Y-axis domain for better visualization
  const allValues = [
    ...chartData.map((d) => d.actualConsumption),
    ...chartData.map((d) => d.estimatedConsumption),
  ];
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const range = maxValue - minValue;
  const yAxisMin = Math.max(0, minValue - range * 0.1);
  const yAxisMax = maxValue + range * 0.1;

  return (
    <div className="mt-6">
      <h4 className="heading-4 mb-3">
        {t.refuels.fuelConsumptionEstimatedVsActual}
      </h4>

      <div className="chart-container">
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
            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
            <XAxis
              type="number"
              dataKey="timestampMs"
              scale="time"
              domain={["dataMin", "dataMax"]}
              stroke={chartTheme.axis}
              fontSize={12}
              tickMargin={10}
              tickFormatter={(value) => {
                const date = new Date(value);
                return formatDate(date, {
                  month: "short",
                  day: "numeric",
                  year: "2-digit",
                });
              }}
            />
            <YAxis
              domain={[yAxisMin, yAxisMax]}
              stroke={chartTheme.axis}
              fontSize={12}
              tickFormatter={(value) => `${value.toFixed(1)}`}
              label={{
                value: t.refuels.consumptionLabelWithUnit,
                angle: -90,
                position: "insideLeft",
                style: { textAnchor: "middle" },
              }}
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
            value={{ value: formatConsumption(avgActual), unit: "L/100km" }}
            icon={
              <BarChartIcon className="icon-lg text-green-600 dark:text-green-400" />
            }
            iconBgColor="green"
          />

          <SummaryCard
            title={t.refuels.avgEstimated}
            value={{ value: formatConsumption(avgEstimated), unit: "L/100km" }}
            icon={
              <NumbersIcon className="icon-lg text-blue-600 dark:text-blue-400" />
            }
            iconBgColor="blue"
          />

          <SummaryCard
            title={t.refuels.avgDifference}
            value={{
              value: `${avgDifference > 0 ? "+" : ""}${formatConsumption(
                Math.abs(avgDifference),
              )}`,
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
            value={{ value: `${accuracyPercentage.toFixed(0)}`, unit: "%" }}
            icon={
              <CheckCircleOutlineIcon className="icon-lg text-purple-600 dark:text-purple-400" />
            }
            iconBgColor="purple"
          />
        </GridLayout>

        <div className="mt-3 text-xs text-secondary">
          <p>
            • <span className="font-medium">{t.refuels.accuracy}</span>{" "}
            {t.refuels.accuracyDescription}
          </p>
          <p>
            •{" "}
            <span className="text-green-600 font-medium">
              {t.refuels.greenLineSolid}
            </span>
            : {t.refuels.actualConsumptionDescription} |
            <span className="text-blue-600 font-medium ml-1">
              {t.refuels.blueLineDashed}
            </span>
            : {t.refuels.yourEstimates}
          </p>
        </div>
      </div>
    </div>
  );
}
