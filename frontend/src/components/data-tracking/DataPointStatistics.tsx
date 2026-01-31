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
import { format } from "date-fns";
import { DataPointResponse } from "@/lib/api";
import SummaryCard from "../common/SummaryCard";
import LoadingSpinner from "../common/LoadingSpinner";
import Panel from "../common/Panel";
import BarChartIcon from "@mui/icons-material/BarChart";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import NumbersIcon from "@mui/icons-material/Numbers";
import { EmptyPanel } from "../common";
import { GridLayout } from "../common/GridLayout";
import { useTranslation } from "@/lib/i18n/LanguageContext";

interface DataPointStatisticsProps {
  dataPoints: DataPointResponse[];
  label: string;
  loading?: boolean;
}

export default function DataPointStatistics({
  dataPoints,
  label,
  loading,
}: DataPointStatisticsProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <Panel title={t.dataTracking.statisticsFor + " " + label}>
        <LoadingSpinner text={t.dataTracking.loadingStatistics} />
      </Panel>
    );
  }

  if (!dataPoints || dataPoints.length === 0) {
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

  // Calculate statistics
  const values = dataPoints.map((point) => point.value);
  const count = values.length;
  const sum = values.reduce((acc, val) => acc + val, 0);
  const average = sum / count;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  // Calculate median
  const sortedValues = [...values].sort((a, b) => a - b);
  const median =
    count % 2 === 0
      ? (sortedValues[count / 2 - 1] + sortedValues[count / 2]) / 2
      : sortedValues[Math.floor(count / 2)];

  // Calculate standard deviation
  const variance =
    values.reduce((acc, val) => acc + Math.pow(val - average, 2), 0) / count;
  const standardDeviation = Math.sqrt(variance);

  // Prepare chart data
  const chartData = dataPoints
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    )
    .map((point, index) => ({
      ...point,
      timestampMs: new Date(point.timestamp).getTime(),
      displayDate: format(new Date(point.timestamp), "MMM d"),
      fullDate: format(new Date(point.timestamp), "MMM d, yyyy 'at' h:mm a"),
      index: index + 1,
    }));

  const formatValue = (value: number) => {
    return Number.isInteger(value) ? value.toString() : value.toFixed(2);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const date = new Date(label);
      const formattedDate = date.toLocaleDateString("en-GB", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const formattedTime = date.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      return (
        <div className="card p-3 shadow-lg">
          <div className="mb-2">
            <p className="font-medium text-primary">{formattedDate}</p>
            <p className="text-sm text-secondary">{formattedTime}</p>
          </div>
          <div className="space-y-1 text-sm">
            <p className="status-blue">
              <span className="font-medium">{t.dataTracking.value}:</span>{" "}
              {formatValue(data.value)}
            </p>
            {data.notes && (
              <p className="text-secondary mt-2 max-w-xs">
                <span className="font-medium">{t.dataTracking.notes}:</span>{" "}
                {data.notes}
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Calculate trends (last 5 vs previous 5, or half vs half if less than 10)
  let trend = "stable";
  let trendPercentage = 0;
  if (count >= 4) {
    const splitPoint = Math.floor(count / 2);
    const firstHalf = values.slice(0, splitPoint);
    const secondHalf = values.slice(splitPoint);

    const firstAvg =
      firstHalf.reduce((acc, val) => acc + val, 0) / firstHalf.length;
    const secondAvg =
      secondHalf.reduce((acc, val) => acc + val, 0) / secondHalf.length;

    if (secondAvg > firstAvg) {
      trend = "increasing";
      trendPercentage = ((secondAvg - firstAvg) / firstAvg) * 100;
    } else if (secondAvg < firstAvg) {
      trend = "decreasing";
      trendPercentage = ((firstAvg - secondAvg) / firstAvg) * 100;
    }
  }

  return (
    <Panel title={t.dataTracking.statisticsFor + ' "' + label + '"'}>
      {/* Summary Statistics */}
      <GridLayout variant="stats" className="mb-6">
        <SummaryCard
          title={t.dataTracking.average}
          value={{ value: average, formatter: formatValue }}
          icon={
            <BarChartIcon className="icon-md text-blue-600 dark:text-blue-400" />
          }
          iconBgColor="blue"
        />

        <SummaryCard
          title={t.dataTracking.median}
          value={{ value: median, formatter: formatValue }}
          icon={
            <BarChartIcon className="icon-md text-green-600 dark:text-green-400" />
          }
          iconBgColor="green"
        />

        <SummaryCard
          title={t.dataTracking.range}
          value={{ value: range, formatter: formatValue }}
          icon={
            <LocalOfferIcon className="icon-md text-yellow-600 dark:text-yellow-400" />
          }
          iconBgColor="yellow"
        />

        <SummaryCard
          title={t.common.entries}
          value={{ value: count }}
          icon={
            <NumbersIcon className="icon-md text-purple-600 dark:text-purple-400" />
          }
          iconBgColor="purple"
        />
      </GridLayout>

      {/* Additional Statistics */}
      <GridLayout variant="stats" className="mb-6">
        <div className="status-red p-3 rounded">
          <div className="font-medium">{t.dataTracking.maximum}</div>
          <div>{formatValue(max)}</div>
        </div>
        <div className="status-green p-3 rounded">
          <div className="font-medium">{t.dataTracking.minimum}</div>
          <div>{formatValue(min)}</div>
        </div>
        <div className="status-gray p-3 rounded">
          <div className="font-medium">{t.dataTracking.stdDeviation}</div>
          <div>{formatValue(standardDeviation)}</div>
        </div>
        <div
          className={`p-3 rounded ${
            trend === "increasing"
              ? "bg-green-50 dark:bg-green-900/20"
              : trend === "decreasing"
              ? "bg-red-50 dark:bg-red-900/20"
              : "bg-gray-50 dark:bg-gray-700"
          }`}
        >
          <div
            className={`font-medium ${
              trend === "increasing"
                ? "text-green-900 dark:text-green-400"
                : trend === "decreasing"
                ? "text-red-900 dark:text-red-400"
                : "text-gray-900 dark:text-gray-100"
            }`}
          >
            {t.dataTracking.trend}
          </div>
          <div
            className={`${
              trend === "increasing"
                ? "text-green-700 dark:text-green-300"
                : trend === "decreasing"
                ? "text-red-700 dark:text-red-300"
                : "text-gray-700 dark:text-gray-300"
            }`}
          >
            {trend === "stable"
              ? t.dataTracking.stable
              : trend === "increasing"
              ? `↗ +${trendPercentage.toFixed(1)}%`
              : `↘ -${trendPercentage.toFixed(1)}%`}
          </div>
        </div>
      </GridLayout>

      {/* Chart */}
      <div className="mt-6">
        <h4 className="heading-4 mb-3">{t.dataTracking.valuesOverTime}</h4>

        <div className="chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 20,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                type="number"
                dataKey="timestampMs"
                scale="time"
                domain={["dataMin", "dataMax"]}
                stroke="#666"
                fontSize={12}
                tickMargin={10}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString("en-GB", {
                    month: "short",
                    day: "numeric",
                    year: "2-digit",
                  });
                }}
              />
              <YAxis
                stroke="#666"
                fontSize={12}
                tickFormatter={(value) => formatValue(value)}
                label={{
                  value: t.dataTracking.value,
                  angle: -90,
                  position: "insideLeft",
                  style: { textAnchor: "middle" },
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#2563eb"
                strokeWidth={3}
                dot={{
                  fill: "#2563eb",
                  strokeWidth: 2,
                  r: 4,
                }}
                activeDot={{
                  r: 6,
                  fill: "#1d4ed8",
                  strokeWidth: 2,
                  stroke: "#fff",
                }}
                name={label}
              />
            </LineChart>
          </ResponsiveContainer>

          <div className="mt-3 text-xs text-secondary">
            <p>• {t.dataTracking.hoverForDetails}</p>
          </div>
        </div>
      </div>
    </Panel>
  );
}
