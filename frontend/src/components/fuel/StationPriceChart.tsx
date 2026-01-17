import { useQuery, keepPreviousData } from "@tanstack/react-query";
import CircularProgress from "@mui/material/CircularProgress";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import apiService, { FuelType } from "@/lib/api";
import { fuelPricesKeys } from "@/lib/hooks/useFuelPrices";
import FuelPriceChart from "./FuelPriceChart";

interface StationPriceChartProps {
  stationId: string;
  fuelType: FuelType;
}

const FUEL_TYPE_COLORS: Record<FuelType, string> = {
  e5: "#ef4444",
  e10: "#f59e0b",
  diesel: "#3b82f6",
};

export default function StationPriceChartContainer({
  stationId,
  fuelType,
}: StationPriceChartProps) {
  const { t } = useTranslation();

  const {
    data: priceHistory,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: fuelPricesKeys.stationPriceHistory(stationId, fuelType),
    queryFn: () => apiService.getStationPriceHistory(stationId, fuelType),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    placeholderData: keepPreviousData, // Keep previous chart visible while loading new data
  });

  const fuelTypeLabels: Record<FuelType, string> = {
    e5: t.fuelPrices.e5,
    e10: t.fuelPrices.e10,
    diesel: t.fuelPrices.diesel,
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
      <div className="flex items-center justify-between mb-4">
        <h3 className="heading-3">
          {fuelTypeLabels[fuelType]} - {t.fuelPrices.priceHistory24h}
        </h3>
        {isFetching && <CircularProgress size={18} />}
      </div>
      {hasValidPriceData ? (
        <FuelPriceChart
          data={priceHistory.price_history}
          fuelType={fuelType}
          color={FUEL_TYPE_COLORS[fuelType]}
          label={fuelTypeLabels[fuelType]}
        />
      ) : (
        <div className="text-center py-8">
          <span className="text-secondary">{t.fuelPrices.noDataAvailable}</span>
        </div>
      )}
    </div>
  );
}
