import { Suspense, useState } from "react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { FuelType, PriceHistoryTimeRange, getTimeRangeHours } from "@/lib/api";
import { useStationPriceHistory } from "@/lib/hooks/useFuelPrices";
import FuelPriceChart from "./FuelPriceChart";
import { LoadingSpinner } from "@/components/common";

interface StationPriceChartProps {
  stationId: string;
  fuelType: FuelType;
}

const CHART_COLOR = "#3b82f6";
const CHART_HEIGHT = "h-72 sm:h-64";

function PriceChartContent({
  stationId,
  fuelType,
  timeRange,
}: {
  stationId: string;
  fuelType: FuelType;
  timeRange: PriceHistoryTimeRange;
}) {
  const { t } = useTranslation();
  const hours = getTimeRangeHours(timeRange);

  const { data: priceHistory } = useStationPriceHistory(
    stationId,
    fuelType,
    timeRange,
  );

  const fuelTypeLabels: Record<FuelType, string> = {
    e5: t.fuelPrices.e5,
    e10: t.fuelPrices.e10,
    diesel: t.fuelPrices.diesel,
  };

  const hasValidPriceData =
    priceHistory &&
    priceHistory.price_history.length > 0 &&
    priceHistory.price_history.some((point) => point.price != null);

  if (!hasValidPriceData) {
    return (
      <div className={`flex items-center justify-center ${CHART_HEIGHT}`}>
        <span className="text-secondary">{t.fuelPrices.noDataAvailable}</span>
      </div>
    );
  }

  return (
    <FuelPriceChart
      data={priceHistory.price_history}
      fuelType={fuelType}
      color={CHART_COLOR}
      label={fuelTypeLabels[fuelType]}
      timeRangeHours={hours}
    />
  );
}

export default function StationPriceChartContainer({
  stationId,
  fuelType,
}: StationPriceChartProps) {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState<PriceHistoryTimeRange>(
    PriceHistoryTimeRange.OneDay,
  );

  const timeRangeLabels: Record<PriceHistoryTimeRange, string> = {
    [PriceHistoryTimeRange.OneDay]: t.fuelPrices.timeRange1Day,
    [PriceHistoryTimeRange.OneWeek]: t.fuelPrices.timeRange1Week,
  };

  return (
    <div className="panel">
      <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <h3 className="heading-2">{t.fuelPrices.priceHistory}</h3>
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
      <Suspense
        fallback={
          <div className={`flex items-center justify-center ${CHART_HEIGHT}`}>
            <LoadingSpinner />
          </div>
        }
      >
        <PriceChartContent
          stationId={stationId}
          fuelType={fuelType}
          timeRange={timeRange}
        />
      </Suspense>
    </div>
  );
}
