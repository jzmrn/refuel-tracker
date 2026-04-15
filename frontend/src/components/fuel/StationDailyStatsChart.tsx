import { Suspense, useState } from "react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import {
  FuelType,
  DailyStatsTimeRange,
  getDailyStatsRangeDays,
} from "@/lib/api";
import { useStationDailyStats } from "@/lib/hooks/useFuelPrices";
import DailyStatsChart from "./DailyStatsChart";
import { LoadingSpinner } from "@/components/common";

interface StationDailyStatsChartProps {
  stationId: string;
  fuelType: FuelType;
}

const CHART_COLOR = "#3b82f6";
const CHART_HEIGHT = "h-72 sm:h-64";

function DailyStatsContent({
  stationId,
  fuelType,
  timeRange,
}: {
  stationId: string;
  fuelType: FuelType;
  timeRange: DailyStatsTimeRange;
}) {
  const { t } = useTranslation();

  const { data: dailyStats } = useStationDailyStats(
    stationId,
    fuelType,
    timeRange,
  );

  const fuelTypeLabels: Record<FuelType, string> = {
    e5: t.fuelPrices.e5,
    e10: t.fuelPrices.e10,
    diesel: t.fuelPrices.diesel,
  };

  const hasValidData =
    dailyStats &&
    dailyStats.daily_stats.length > 0 &&
    dailyStats.daily_stats.some((point) => point.price_mean != null);

  if (!hasValidData) {
    return (
      <div className={`flex items-center justify-center ${CHART_HEIGHT}`}>
        <span className="text-secondary">{t.fuelPrices.noDataAvailable}</span>
      </div>
    );
  }

  return (
    <DailyStatsChart
      data={dailyStats.daily_stats}
      fuelType={fuelType}
      color={CHART_COLOR}
      label={fuelTypeLabels[fuelType]}
    />
  );
}

export default function StationDailyStatsChartContainer({
  stationId,
  fuelType,
}: StationDailyStatsChartProps) {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState<DailyStatsTimeRange>(
    DailyStatsTimeRange.OneWeek,
  );

  const timeRangeLabels: Record<DailyStatsTimeRange, string> = {
    [DailyStatsTimeRange.OneWeek]: t.fuelPrices.timeRange1Week,
    [DailyStatsTimeRange.OneMonth]: t.fuelPrices.timeRange1Month,
  };

  return (
    <div className="panel">
      <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <h3 className="heading-2">{t.fuelPrices.dailyStats}</h3>
        </div>
        <div className="flex gap-2">
          {Object.values(DailyStatsTimeRange).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={
                timeRange === range
                  ? "btn-toggle-active"
                  : "btn-toggle-inactive"
              }
            >
              {timeRangeLabels[range]}
            </button>
          ))}
        </div>
      </div>
      <Suspense
        fallback={
          <div className={`flex items-center justify-center ${CHART_HEIGHT}`}>
            <LoadingSpinner />
          </div>
        }
      >
        <DailyStatsContent
          stationId={stationId}
          fuelType={fuelType}
          timeRange={timeRange}
        />
      </Suspense>
    </div>
  );
}
