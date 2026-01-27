import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import CircularProgress from "@mui/material/CircularProgress";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import apiService, {
  FuelType,
  DailyStatsTimeRange,
  getDailyStatsRangeDays,
} from "@/lib/api";
import { fuelPricesKeys } from "@/lib/hooks/useFuelPrices";
import DailyPriceChangesChart from "./DailyPriceChangesChart";

interface StationPriceChangesChartProps {
  stationId: string;
  fuelType: FuelType;
}

export default function StationPriceChangesChartContainer({
  stationId,
  fuelType,
}: StationPriceChangesChartProps) {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState<DailyStatsTimeRange>(
    DailyStatsTimeRange.OneWeek,
  );

  const days = getDailyStatsRangeDays(timeRange);

  const {
    data: dailyStats,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: fuelPricesKeys.stationDailyStats(stationId, fuelType, timeRange),
    queryFn: () => apiService.getStationDailyStats(stationId, fuelType, days),
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // Keep in cache for 1 hour
    placeholderData: keepPreviousData,
  });

  const timeRangeLabels: Record<DailyStatsTimeRange, string> = {
    [DailyStatsTimeRange.OneWeek]: t.fuelPrices.timeRange1Week,
    [DailyStatsTimeRange.OneMonth]: t.fuelPrices.timeRange1Month,
  };

  // Only show loading on initial load
  if (isLoading && !dailyStats) {
    return (
      <div className="panel flex flex-col items-center justify-center py-12">
        <CircularProgress size={24} />
        <span className="text-secondary mt-3 text-sm">{t.common.loading}</span>
      </div>
    );
  }

  // Check if there's any valid data
  const hasValidData =
    dailyStats &&
    dailyStats.daily_stats.length > 0 &&
    dailyStats.daily_stats.some(
      (point) => point.n_price_changes != null || point.n_unique_prices != null,
    );

  return (
    <div
      className={`panel ${isFetching ? "opacity-80" : ""} transition-opacity`}
    >
      <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <h3 className="heading-2">{t.fuelPrices.priceActivity}</h3>
          {isFetching && <CircularProgress size={18} />}
        </div>
        <div className="flex gap-2">
          {Object.values(DailyStatsTimeRange).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === range
                  ? "bg-primary-50 text-primary-700 dark:bg-blue-900/20 dark:text-blue-300"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {timeRangeLabels[range]}
            </button>
          ))}
        </div>
      </div>
      {hasValidData ? (
        <DailyPriceChangesChart data={dailyStats.daily_stats} />
      ) : (
        <div className="text-center py-8">
          <span className="text-secondary">{t.fuelPrices.noDataAvailable}</span>
        </div>
      )}
    </div>
  );
}
