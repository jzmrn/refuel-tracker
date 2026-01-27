import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import CircularProgress from "@mui/material/CircularProgress";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import apiService, {
  FuelType,
  PriceHistoryTimeRange,
  getTimeRangeHours,
} from "@/lib/api";
import { fuelPricesKeys } from "@/lib/hooks/useFuelPrices";
import FuelPriceChart from "./FuelPriceChart";

interface StationPriceChartProps {
  stationId: string;
  fuelType: FuelType;
}

const CHART_COLOR = "#3b82f6";

export default function StationPriceChartContainer({
  stationId,
  fuelType,
}: StationPriceChartProps) {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState<PriceHistoryTimeRange>(
    PriceHistoryTimeRange.OneDay,
  );

  const hours = getTimeRangeHours(timeRange);

  const {
    data: priceHistory,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: fuelPricesKeys.stationPriceHistory(
      stationId,
      fuelType,
      timeRange,
    ),
    queryFn: () =>
      apiService.getStationPriceHistory(stationId, fuelType, hours),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    placeholderData: keepPreviousData, // Keep previous chart visible while loading new data
  });

  const fuelTypeLabels: Record<FuelType, string> = {
    e5: t.fuelPrices.e5,
    e10: t.fuelPrices.e10,
    diesel: t.fuelPrices.diesel,
  };

  const timeRangeLabels: Record<PriceHistoryTimeRange, string> = {
    [PriceHistoryTimeRange.OneDay]: t.fuelPrices.timeRange1Day,
    [PriceHistoryTimeRange.OneWeek]: t.fuelPrices.timeRange1Week,
  };

  // Only show loading on initial load, not when switching fuel types
  if (isLoading && !priceHistory) {
    return (
      <div className="panel flex flex-col items-center justify-center py-12">
        <CircularProgress size={24} />
        <span className="text-secondary mt-3 text-sm">{t.common.loading}</span>
      </div>
    );
  }

  // Check if there's any valid price data (not just empty array, but also no null/undefined prices)
  const hasValidPriceData =
    priceHistory &&
    priceHistory.price_history.length > 0 &&
    priceHistory.price_history.some((point) => point.price != null);

  return (
    <div
      className={`panel ${isFetching ? "opacity-80" : ""} transition-opacity`}
    >
      <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <h3 className="heading-2">{t.fuelPrices.priceHistory}</h3>
          {isFetching && <CircularProgress size={18} />}
        </div>
        <div className="flex gap-2">
          {Object.values(PriceHistoryTimeRange).map((range) => (
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
      {hasValidPriceData ? (
        <FuelPriceChart
          data={priceHistory.price_history}
          fuelType={fuelType}
          color={CHART_COLOR}
          label={fuelTypeLabels[fuelType]}
          timeRangeHours={hours}
        />
      ) : (
        <div className="text-center py-8">
          <span className="text-secondary">{t.fuelPrices.noDataAvailable}</span>
        </div>
      )}
    </div>
  );
}
