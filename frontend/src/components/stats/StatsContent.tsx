import React, { Suspense, useState, useEffect, startTransition } from "react";
import { FuelType } from "@/lib/api";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import StatsFilters from "@/components/stats/StatsFilters";
import StatsAggregateTables from "@/components/stats/StatsAggregateTables";
import {
  useAvailableMonths,
  useMonthlyStationAggregates,
  useMonthlyPlaceAggregates,
  useMonthlyBrandAggregates,
} from "@/lib/hooks/useStats";

const FUEL_TYPE_STORAGE_KEY = "stats.fuelType";
const MONTH_STORAGE_KEY = "stats.selectedMonth";

/**
 * Inner component that fetches aggregate data using suspense hooks.
 * Only rendered when selectedMonth is guaranteed to be a valid string.
 */
function StatsAggregateData({
  selectedMonth,
  selectedFuelType,
}: {
  selectedMonth: string;
  selectedFuelType: FuelType;
}) {
  const { data: stations } = useMonthlyStationAggregates(
    selectedMonth,
    selectedFuelType,
    10,
  );

  const { data: places } = useMonthlyPlaceAggregates(
    selectedMonth,
    selectedFuelType,
    10,
  );

  const { data: brands } = useMonthlyBrandAggregates(
    selectedMonth,
    selectedFuelType,
    10,
  );

  return (
    <StatsAggregateTables stations={stations} places={places} brands={brands} />
  );
}

const StatsContent: React.FC = () => {
  const { t } = useTranslation();

  const [selectedFuelType, setSelectedFuelType] = useState<FuelType>("e5");
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const { data: availableMonths } = useAvailableMonths();

  // Restore persisted selections and auto-select latest month on mount
  useEffect(() => {
    startTransition(() => {
      const storedFuel = localStorage.getItem(FUEL_TYPE_STORAGE_KEY);
      if (
        storedFuel === "e5" ||
        storedFuel === "e10" ||
        storedFuel === "diesel"
      ) {
        setSelectedFuelType(storedFuel);
      }

      if (availableMonths.length > 0) {
        const storedMonth = localStorage.getItem(MONTH_STORAGE_KEY);
        const isValid = availableMonths.some((m) => m.date === storedMonth);
        setSelectedMonth(isValid ? storedMonth : availableMonths[0].date);
      }
    });
  }, [availableMonths]);

  const handleFuelTypeChange = (fuelType: FuelType) => {
    setSelectedFuelType(fuelType);
    localStorage.setItem(FUEL_TYPE_STORAGE_KEY, fuelType);
  };

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    localStorage.setItem(MONTH_STORAGE_KEY, month);
  };

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

      {selectedMonth && (
        <Suspense fallback={<LoadingSpinner />}>
          <StatsAggregateData
            selectedMonth={selectedMonth}
            selectedFuelType={selectedFuelType}
          />
        </Suspense>
      )}
    </div>
  );
};

export default StatsContent;
