import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import SummaryCard from "../common/SummaryCard";
import Panel from "../common/Panel";
import { GridLayout } from "../common/GridLayout";
import { MobileChartCard } from "../common/MobileChartCard";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import BarChartIcon from "@mui/icons-material/BarChart";
import FilterListIcon from "@mui/icons-material/FilterList";
import {
  useTranslation,
  useLocalization,
} from "../../lib/i18n/LanguageContext";
import { useChartTheme } from "../../lib/theme";
import { axisConfig, useGridConfig, useChartKey } from "../../lib/chartConfig";
import { useIsMobile } from "../../lib/hooks/useIsMobile";

interface RefuelDataForChart {
  timestamp: string;
}

interface RefuelDaysBetweenChartProps {
  refuelData: RefuelDataForChart[];
}

export default function RefuelDaysBetweenChart({
  refuelData,
}: RefuelDaysBetweenChartProps) {
  const { t } = useTranslation();
  const { formatDate } = useLocalization();
  const chartTheme = useChartTheme();
  const gridConfig = useGridConfig();
  const chartKey = useChartKey(refuelData);
  const isMobile = useIsMobile();
  const [selectedPoint, setSelectedPoint] = useState<any>(null);

  if (!refuelData || refuelData.length < 2) {
    return (
      <Panel title={t.refuels.daysBetweenRefuels}>
        <div className="empty-state">
          <p>{t.refuels.noDaysBetweenDataAvailable}</p>
          <p className="text-sm mt-1">
            {t.refuels.addMoreRefuelEntriesToSeeDaysBetweenTrends}
          </p>
        </div>
      </Panel>
    );
  }

  // Sort chronologically
  const sorted = [...refuelData].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  // Calculate days between consecutive refuels
  const chartData = sorted.slice(1).map((item, index) => {
    const currentDate = new Date(item.timestamp);
    const previousDate = new Date(sorted[index].timestamp);
    const diffMs = currentDate.getTime() - previousDate.getTime();
    const days = Math.round(diffMs / (1000 * 60 * 60 * 24));

    const formatShortDate = (date: Date) =>
      formatDate(date, { day: "2-digit", month: "2-digit" });

    return {
      displayDate: `${formatShortDate(currentDate)} - ${formatShortDate(
        previousDate,
      )}`,
      days,
      currentTimestamp: item.timestamp,
      previousTimestamp: sorted[index].timestamp,
    };
  });

  if (chartData.length === 0) {
    return (
      <Panel title={t.refuels.daysBetweenRefuels}>
        <div className="empty-state">
          <p>{t.refuels.noDaysBetweenDataAvailable}</p>
          <p className="text-sm mt-1">
            {t.refuels.addMoreRefuelEntriesToSeeDaysBetweenTrends}
          </p>
        </div>
      </Panel>
    );
  }

  const renderTooltipContent = (data: any) => {
    const currentDate = new Date(data.currentTimestamp);
    const previousDate = new Date(data.previousTimestamp);
    const formattedCurrent = formatDate(currentDate, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const formattedPrevious = formatDate(previousDate, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    return (
      <>
        <div className="mb-2">
          <p className="text-primary font-medium">{formattedCurrent}</p>
          <p className="text-sm text-secondary">{formattedPrevious}</p>
        </div>
        <div className="space-y-1 text-sm">
          <p className="flex justify-between gap-4">
            <span className="text-gray-400">{t.refuels.days}:</span>
            <span className="text-blue-600 dark:text-blue-400 font-semibold">
              {data.days} {t.refuels.daysUnit}
            </span>
          </p>
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

  // Calculate statistics
  const daysValues = chartData.map((item) => item.days);
  const minDays = Math.min(...daysValues);
  const maxDays = Math.max(...daysValues);
  const avgDays = daysValues.reduce((sum, d) => sum + d, 0) / daysValues.length;
  const sortedDays = [...daysValues].sort((a, b) => a - b);
  const medianDays =
    sortedDays.length % 2 === 0
      ? (sortedDays[sortedDays.length / 2 - 1] +
          sortedDays[sortedDays.length / 2]) /
        2
      : sortedDays[Math.floor(sortedDays.length / 2)];

  return (
    <Panel title={t.refuels.daysBetweenRefuels}>
      <GridLayout variant="stats" className="mb-4 text-sm">
        <SummaryCard
          title={t.refuels.minDaysBetween}
          value={{
            value: minDays,
            formatter: (value) => value.toFixed(0),
            unit: t.refuels.daysUnit,
          }}
          icon={
            <TrendingDownIcon className="icon-lg text-green-600 dark:text-green-400" />
          }
          iconBgColor="green"
        />

        <SummaryCard
          title={t.refuels.maxDaysBetween}
          value={{
            value: maxDays,
            formatter: (value) => value.toFixed(0),
            unit: t.refuels.daysUnit,
          }}
          icon={
            <TrendingUpIcon className="icon-lg text-red-600 dark:text-red-400" />
          }
          iconBgColor="red"
        />

        <SummaryCard
          title={t.refuels.avgDaysBetween}
          value={{
            value: avgDays,
            formatter: (value) => value.toFixed(1),
            unit: t.refuels.daysUnit,
          }}
          icon={
            <BarChartIcon className="icon-lg text-yellow-600 dark:text-yellow-400" />
          }
          iconBgColor="yellow"
        />

        <SummaryCard
          title={t.refuels.medianDaysBetween}
          value={{
            value: medianDays,
            formatter: (value) => value.toFixed(1),
            unit: t.refuels.daysUnit,
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
          <CartesianGrid {...gridConfig} />
          <XAxis
            dataKey="displayDate"
            stroke={chartTheme.axis}
            {...axisConfig.xAxis}
          />
          <YAxis
            stroke={chartTheme.axis}
            tickFormatter={(value) => `${value}`}
            {...axisConfig.yAxis}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="days"
            fill={chartTheme.primaryLine}
            radius={[4, 4, 0, 0]}
          />
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
