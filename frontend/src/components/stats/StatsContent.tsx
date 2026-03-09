import React, { useState, useEffect } from "react";
import { FuelType } from "@/lib/api";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import StatsFilters from "@/components/stats/StatsFilters";
import StatsAggregateTables from "@/components/stats/StatsAggregateTables";
import {
  useAvailableMonthsWithMinLoadTime,
  useMonthlyStationAggregatesWithMinLoadTime,
  useMonthlyPlaceAggregatesWithMinLoadTime,
  useMonthlyBrandAggregatesWithMinLoadTime,
} from "@/lib/hooks/useStats";

const FUEL_TYPE_STORAGE_KEY = "stats.fuelType";
const MONTH_STORAGE_KEY = "stats.selectedMonth";

const StatsContent: React.FC = () => {
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

  const [selectedMonth, setSelectedMonth] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(MONTH_STORAGE_KEY);
    }
    return null;
  });

  const { data: availableMonths = [], isLoading: monthsLoading } =
    useAvailableMonthsWithMinLoadTime();

  // Auto-select latest month when data loads and no month is selected (or stored month is unavailable)
  useEffect(() => {
    if (availableMonths.length > 0) {
      const stored = selectedMonth;
      const isValid = availableMonths.some((m) => m.date === stored);
      if (!stored || !isValid) {
        setSelectedMonth(availableMonths[0].date);
      }
    }
  }, [availableMonths]);

  const handleFuelTypeChange = (fuelType: FuelType) => {
    setSelectedFuelType(fuelType);
    localStorage.setItem(FUEL_TYPE_STORAGE_KEY, fuelType);
  };

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    localStorage.setItem(MONTH_STORAGE_KEY, month);
  };

  const { data: stations = [], isLoading: stationsLoading } =
    useMonthlyStationAggregatesWithMinLoadTime(
      selectedMonth,
      selectedFuelType,
      10,
    );

  const { data: places = [], isLoading: placesLoading } =
    useMonthlyPlaceAggregatesWithMinLoadTime(
      selectedMonth,
      selectedFuelType,
      10,
    );

  const { data: brands = [], isLoading: brandsLoading } =
    useMonthlyBrandAggregatesWithMinLoadTime(
      selectedMonth,
      selectedFuelType,
      10,
    );

  if (monthsLoading) {
    return <LoadingSpinner text={t.common.loading} />;
  }

  if (availableMonths.length === 0) {
    return (
      <div className="card text-center py-8">
        <p className="text-secondary">{t.statistics.noMonthsAvailable}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StatsFilters
        selectedMonth={selectedMonth}
        onMonthChange={handleMonthChange}
        availableMonths={availableMonths}
        selectedFuelType={selectedFuelType}
        onFuelTypeChange={handleFuelTypeChange}
      />

      <StatsAggregateTables
        stations={stations}
        places={places}
        brands={brands}
        stationsLoading={stationsLoading}
        placesLoading={placesLoading}
        brandsLoading={brandsLoading}
      />
    </div>
  );
};

export default StatsContent;
