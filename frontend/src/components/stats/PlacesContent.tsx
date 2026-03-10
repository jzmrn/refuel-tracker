import React, { useState } from "react";
import { FuelType } from "@/lib/api";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { StandardCard } from "@/components/common";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import FuelTypeSelector from "@/components/fuel/FuelTypeSelector";
import TimeRangeSelector from "@/components/stats/TimeRangeSelector";
import PlaceAvgPriceChart from "@/components/stats/PlaceAvgPriceChart";
import PlaceVarianceChart from "@/components/stats/PlaceVarianceChart";
import PlacePriceActivityChart from "@/components/stats/PlacePriceActivityChart";
import { usePlaceDetailsWithMinLoadTime } from "@/lib/hooks/useStats";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import OilBarrel from "@mui/icons-material/OilBarrel";
import PlaceIcon from "@mui/icons-material/Place";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import SwapVertIcon from "@mui/icons-material/SwapVert";

const FUEL_TYPE_STORAGE_KEY = "placesDetails.fuelType";
const MONTHS_STORAGE_KEY = "placesDetails.months";

const PlacesContent: React.FC = () => {
  const { t } = useTranslation();

  const [selectedFuelType, setSelectedFuelType] = useState<FuelType>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(FUEL_TYPE_STORAGE_KEY);
      if (stored === "e5" || stored === "e10" || stored === "diesel") {
        return stored;
      }
    }
    return "e5";
  });

  const [selectedMonths, setSelectedMonths] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(MONTHS_STORAGE_KEY);
      if (stored === "3" || stored === "12") {
        return parseInt(stored, 10);
      }
    }
    return 3;
  });

  const handleFuelTypeChange = (fuelType: FuelType) => {
    setSelectedFuelType(fuelType);
    localStorage.setItem(FUEL_TYPE_STORAGE_KEY, fuelType);
  };

  const handleMonthsChange = (months: number) => {
    setSelectedMonths(months);
    localStorage.setItem(MONTHS_STORAGE_KEY, String(months));
  };

  const { data: placeDetails = [], isLoading } = usePlaceDetailsWithMinLoadTime(
    selectedFuelType,
    selectedMonths,
  );

  return (
    <div className="space-y-6">
      <StandardCard
        title={t.statistics.timeRange}
        icon={
          <CalendarMonthIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        }
        iconBackground="blue"
      >
        <TimeRangeSelector
          selectedMonths={selectedMonths}
          onMonthsChange={handleMonthsChange}
        />
      </StandardCard>

      <StandardCard
        title={t.statistics.selectFuelType}
        icon={
          <OilBarrel className="w-5 h-5 text-green-600 dark:text-green-400" />
        }
        iconBackground="green"
      >
        <FuelTypeSelector
          selectedFuelType={selectedFuelType}
          onFuelTypeChange={handleFuelTypeChange}
        />
      </StandardCard>

      {isLoading ? (
        <LoadingSpinner text={t.common.loading} />
      ) : placeDetails.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-secondary">{t.statistics.noDataAvailable}</p>
        </div>
      ) : (
        <>
          <StandardCard
            title={t.statistics.avgPriceByPlace}
            icon={
              <PlaceIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            }
            iconBackground="orange"
          >
            <PlaceAvgPriceChart data={placeDetails} />
          </StandardCard>

          <StandardCard
            title={t.statistics.priceVarianceByPlace}
            icon={
              <TrendingDownIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            }
            iconBackground="purple"
          >
            <PlaceVarianceChart data={placeDetails} />
          </StandardCard>

          <StandardCard
            title={t.statistics.priceActivityByPlace}
            icon={
              <SwapVertIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            }
            iconBackground="indigo"
          >
            <PlacePriceActivityChart data={placeDetails} />
          </StandardCard>
        </>
      )}
    </div>
  );
};

export default PlacesContent;
