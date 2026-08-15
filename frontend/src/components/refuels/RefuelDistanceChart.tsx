import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Rectangle,
  Cell,
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
import {
  axisConfig,
  chartClassNames,
  useGridConfig,
  useChartKey,
} from "../../lib/chartConfig";
import { useIsMobile } from "../../lib/hooks/useIsMobile";

interface RefuelDataForChart {
  timestamp: string;
  price: number;
  amount: number;
  kilometers_since_last_refuel: number;
  estimated_fuel_consumption: number;
  notes?: string;
  remaining_range_km?: number | null;
  is_full_tank?: boolean;
}

interface RefuelDistanceChartProps {
  refuelData: RefuelDataForChart[];
}

// Custom shape for the distance bar so the rounded top corners are decided
// per data point. When an entry has a remaining range stacked on top, the
// distance segment is the bottom of the stack and stays flat; when the
// remaining range is zero, the distance segment is the topmost visible part
// and should carry the rounded corners.
function DistanceBarShape(props: any) {
  const radius: [number, number, number, number] =
    props.payload?.remainingRange > 0 ? [0, 0, 0, 0] : [4, 4, 0, 0];
  return <Rectangle {...props} radius={radius} />;
}

export default function RefuelDistanceChart({
  refuelData,
}: RefuelDistanceChartProps) {
  const { t } = useTranslation();
  const { formatDate, formatNumber } = useLocalization();
  const chartTheme = useChartTheme();
  const gridConfig = useGridConfig();
  const chartKey = useChartKey(refuelData);
  const isMobile = useIsMobile();
  const [selectedPoint, setSelectedPoint] = useState<any>(null);

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

  // Timestamps of full fills that close a group containing partial fills.
  // Their remaining range cannot be estimated because the tank level before the
  // partial fills is unknown.
  const sortedData = [...refuelData].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
  const combinedAnchors = new Set<string>();
  let hasPendingPartial = false;
  for (const item of sortedData) {
    if (item.is_full_tank === false) {
      hasPendingPartial = true;
    } else {
      if (hasPendingPartial) combinedAnchors.add(item.timestamp);
      hasPendingPartial = false;
    }
  }

  // Process data and filter entries with valid distance
  // For partial fills: show bar but no remaining range
  const chartData = sortedData
    .filter((item) => item.kilometers_since_last_refuel > 0)
    .map((item) => {
      const isFullTank = item.is_full_tank !== false;
      // Remaining range is only meaningful for a full fill that follows another
      // full fill — after partial fills the tank level is unknown.
      const showRemainingRange =
        isFullTank && !combinedAnchors.has(item.timestamp);
      return {
        ...item,
        timestampMs: new Date(item.timestamp).getTime(),
        displayDate: formatDate(new Date(item.timestamp), {
          month: "short",
          day: "numeric",
          year: "2-digit",
        }),
        distance: item.kilometers_since_last_refuel,
        remainingRange: showRemainingRange ? item.remaining_range_km ?? 0 : 0,
        showRemainingRange,
        isFullTank,
      };
    });

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
    const totalRange = data.distance + data.remainingRange;
    const remainingRangeClassName =
      data.remainingRange > 0
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-red-600 dark:text-red-400";
    return (
      <>
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
          {data.showRemainingRange && (
            <>
              <p className="flex justify-between gap-4">
                <span className="text-gray-400">
                  {t.refuels.remainingRange}:
                </span>
                <span className={`${remainingRangeClassName} font-semibold`}>
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
      </>
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (isMobile || !active || !payload || !payload.length) return null;
    return (
      <div className="panel">{renderTooltipContent(payload[0].payload)}</div>
    );
  };

  // Calculate statistics (use only full fill data for accuracy)
  const fullFillData = chartData.filter((item) => item.isFullTank);
  const hasPartialFills = chartData.some((item) => !item.isFullTank);
  const distances =
    fullFillData.length > 0
      ? fullFillData.map((item) => item.distance)
      : chartData.map((item) => item.distance);
  const minDistance = Math.min(...distances);
  const maxDistance = Math.max(...distances);
  const avgDistance =
    distances.reduce((sum, d) => sum + d, 0) / distances.length;
  const sortedDistances = [...distances].sort((a, b) => a - b);
  const medianDistance =
    sortedDistances.length % 2 === 0
      ? (sortedDistances[sortedDistances.length / 2 - 1] +
          sortedDistances[sortedDistances.length / 2]) /
        2
      : sortedDistances[Math.floor(sortedDistances.length / 2)];

  const renderCustomLegend = () => (
    <div className={chartClassNames.legendContainer}>
      <div className={chartClassNames.legendItem}>
        <span
          className={chartClassNames.legendSwatch}
          style={{ backgroundColor: chartTheme.primaryLine }}
        />
        <span className={chartClassNames.legendText}>{t.refuels.distance}</span>
      </div>
      {hasPartialFills && (
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
      {hasRemainingRange && (
        <div className={chartClassNames.legendItem}>
          <span
            className={`${chartClassNames.legendSwatch} opacity-50`}
            style={{ backgroundColor: chartTheme.secondaryLine }}
          />
          <span className={chartClassNames.legendText}>
            {t.refuels.remainingRange}
          </span>
        </div>
      )}
    </div>
  );

  return (
    <Panel title={t.refuels.distanceSinceLastRefuel}>
      <GridLayout variant="stats" className="mb-4 text-sm">
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

        <SummaryCard
          title={t.refuels.medianDistance}
          value={{
            value: medianDistance,
            formatter: (value) => formatDistance(value),
            unit: "km",
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
            tickFormatter={(value) => `${value.toFixed(0)} km`}
            {...axisConfig.yAxis}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend content={renderCustomLegend} />
          <Bar
            dataKey="distance"
            stackId="range"
            fill={chartTheme.primaryLine}
            name={t.refuels.distance}
            shape={<DistanceBarShape />}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.isFullTank ? chartTheme.primaryLine : "#f59e0b"}
              />
            ))}
          </Bar>
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

      {isMobile && (
        <MobileChartCard>
          {renderTooltipContent(selectedPoint ?? chartData[0])}
        </MobileChartCard>
      )}
    </Panel>
  );
}
