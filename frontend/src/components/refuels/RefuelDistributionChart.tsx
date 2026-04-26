import React, { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import Panel from "../common/Panel";
import { useTranslation } from "../../lib/i18n/LanguageContext";
import { RefuelMetric } from "@/lib/api";

interface RefuelDistributionChartProps {
  refuelData: RefuelMetric[];
}

interface DistributionData {
  name: string;
  value: number;
  percentage: number;
}

// Color palette for pie slices
const COLORS = [
  "#3B82F6", // blue-500
  "#10B981", // green-500
  "#F59E0B", // amber-500
  "#EF4444", // red-500
  "#8B5CF6", // violet-500
  "#EC4899", // pink-500
  "#06B6D4", // cyan-500
  "#F97316", // orange-500
  "#6366F1", // indigo-500
  "#84CC16", // lime-500
  "#14B8A6", // teal-500
  "#A855F7", // purple-500
];

// Gray color for "Unknown" slice
const UNKNOWN_COLOR = "#6B7280"; // gray-500

function aggregateByKey(
  data: RefuelMetric[],
  keyExtractor: (item: RefuelMetric) => string | undefined,
  unknownLabel: string,
): DistributionData[] {
  const counts = new Map<string, number>();

  data.forEach((item) => {
    const key = keyExtractor(item) || unknownLabel;
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  const total = data.length;
  const result: DistributionData[] = [];

  counts.forEach((value, name) => {
    result.push({
      name,
      value,
      percentage: Math.round((value / total) * 100),
    });
  });

  // Sort by value descending, but keep "Unknown" at the end
  return result.sort((a, b) => {
    if (a.name === unknownLabel) return 1;
    if (b.name === unknownLabel) return -1;
    return b.value - a.value;
  });
}

function getStationDisplayName(refuel: RefuelMetric): string | undefined {
  if (!refuel.station_id) return undefined;

  // Prefer brand + place for clearer identification
  if (refuel.station_brand && refuel.station_place) {
    return `${refuel.station_brand} ${refuel.station_place}`;
  }
  if (refuel.station_brand) {
    return refuel.station_brand;
  }
  // Fallback to station_id truncated
  return refuel.station_id.substring(0, 8);
}

interface DistributionPieProps {
  data: DistributionData[];
  unknownLabel: string;
  outerRadius: number;
  size: number;
}

function DistributionPie({
  data,
  unknownLabel,
  outerRadius,
  size,
}: DistributionPieProps) {
  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    value,
    percentage,
  }: {
    cx: number;
    cy: number;
    midAngle: number;
    innerRadius: number;
    outerRadius: number;
    value: number;
    percentage: number;
  }) => {
    // Only show label if slice is large enough (at least 10%)
    if (percentage < 10) return null;

    const RADIAN = Math.PI / 180;
    // Position label in the middle of the slice
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="#ffffff"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-xs font-medium"
        style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
      >
        {`${value} (${percentage}%)`}
      </text>
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="panel text-sm">
          <p className="font-medium">{data.name}</p>
          <p className="text-gray-600 dark:text-gray-400">
            {data.value} ({data.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <PieChart width={size} height={size}>
      <Pie
        data={data}
        cx="50%"
        cy="50%"
        outerRadius={outerRadius}
        innerRadius={0}
        dataKey="value"
        label={renderCustomLabel}
        labelLine={false}
      >
        {data.map((entry, index) => (
          <Cell
            key={`cell-${index}`}
            fill={
              entry.name === unknownLabel
                ? UNKNOWN_COLOR
                : COLORS[index % COLORS.length]
            }
          />
        ))}
      </Pie>
      <Tooltip content={<CustomTooltip />} />
    </PieChart>
  );
}

interface PieChartSectionProps {
  title: string;
  data: DistributionData[];
  unknownLabel: string;
  noDataLabel: string;
}

function PieChartSection({
  title,
  data,
  unknownLabel,
  noDataLabel,
}: PieChartSectionProps) {
  if (data.length === 0) {
    return (
      <div className="flex-1 min-w-[200px]">
        <h3 className="text-sm font-medium text-center mb-2 text-gray-600 dark:text-gray-400">
          {title}
        </h3>
        <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">
          {noDataLabel}
        </div>
      </div>
    );
  }

  const Legend = () => (
    <div className="flex flex-col gap-1 text-xs overflow-hidden w-full">
      {data.map((entry, index) => (
        <div
          key={entry.name}
          className="flex items-center gap-2 min-w-0 w-full"
        >
          <div
            className="w-3 h-3 rounded-sm flex-shrink-0"
            style={{
              backgroundColor:
                entry.name === unknownLabel
                  ? UNKNOWN_COLOR
                  : COLORS[index % COLORS.length],
            }}
          />
          <span className="text-gray-700 dark:text-gray-300 truncate min-w-0 flex-1">
            {entry.name}
          </span>
          <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap text-right">
            {entry.value} ({entry.percentage}%)
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex-1 min-w-[200px]">
      <h3 className="text-sm font-medium text-center mb-2 text-gray-600 dark:text-gray-400">
        {title}
      </h3>
      {/* xs (default): chart on top, legend below */}
      <div className="block sm:hidden">
        <div className="flex justify-center">
          <DistributionPie
            data={data}
            unknownLabel={unknownLabel}
            outerRadius={75}
            size={180}
          />
        </div>
        <div className="mt-3">
          <Legend />
        </div>
      </div>
      {/* sm to md: chart on left, legend on right */}
      <div className="hidden sm:flex sm:flex-row gap-4 lg:hidden">
        <div className="flex-shrink-0">
          <DistributionPie
            data={data}
            unknownLabel={unknownLabel}
            outerRadius={80}
            size={180}
          />
        </div>
        <div className="flex-1 min-w-0 flex items-center">
          <Legend />
        </div>
      </div>
      {/* Large screens (lg+): chart on top, legend below */}
      <div className="hidden lg:block">
        <div className="flex justify-center">
          <DistributionPie
            data={data}
            unknownLabel={unknownLabel}
            outerRadius={85}
            size={200}
          />
        </div>
        <div className="mt-3">
          <Legend />
        </div>
      </div>
    </div>
  );
}

export default function RefuelDistributionChart({
  refuelData,
}: RefuelDistributionChartProps) {
  const { t } = useTranslation();

  const unknownLabel = t.refuels.unknownStation || "Unknown";
  const noDataLabel = t.fuelPrices.noDataAvailable;

  const { byStation, byBrand, byPlace } = useMemo(() => {
    if (!refuelData || refuelData.length === 0) {
      return { byStation: [], byBrand: [], byPlace: [] };
    }

    return {
      byStation: aggregateByKey(
        refuelData,
        (item) => getStationDisplayName(item),
        unknownLabel,
      ),
      byBrand: aggregateByKey(
        refuelData,
        (item) => item.station_brand,
        unknownLabel,
      ),
      byPlace: aggregateByKey(
        refuelData,
        (item) => item.station_place,
        unknownLabel,
      ),
    };
  }, [refuelData, unknownLabel]);

  if (!refuelData || refuelData.length === 0) {
    return (
      <Panel title={t.refuels.refuelDistribution}>
        <div className="empty-state">
          <p>{t.refuels.noDistributionDataAvailable}</p>
          <p className="text-sm mt-1">{t.refuels.addMoreRefuelEntries}</p>
        </div>
      </Panel>
    );
  }

  return (
    <Panel title={t.refuels.refuelDistribution}>
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
        <PieChartSection
          title={t.refuels.byStation}
          data={byStation}
          unknownLabel={unknownLabel}
          noDataLabel={noDataLabel}
        />
        <PieChartSection
          title={t.refuels.byBrand}
          data={byBrand}
          unknownLabel={unknownLabel}
          noDataLabel={noDataLabel}
        />
        <PieChartSection
          title={t.refuels.byPlace}
          data={byPlace}
          unknownLabel={unknownLabel}
          noDataLabel={noDataLabel}
        />
      </div>
    </Panel>
  );
}
