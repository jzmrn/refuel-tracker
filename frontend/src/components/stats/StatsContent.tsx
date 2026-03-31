import React, { Suspense, useState } from "react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useFuelType } from "@/lib/fuelType";
import { FuelType } from "@/lib/api";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { StackLayout } from "@/components/common";
import StatsFilters from "@/components/stats/StatsFilters";
import StatsAggregateTables from "@/components/stats/StatsAggregateTables";
import {
  useAvailableMonths,
  useMonthlyStationAggregates,
  useMonthlyPlaceAggregates,
  useMonthlyBrandAggregates,
} from "@/lib/hooks/useStats";

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

  // useAvailableMonths is a suspense query — data is ready on first render,
  // so we can derive the initial selectedMonth synchronously.
  const { data: availableMonths } = useAvailableMonths();

  const { fuelType: selectedFuelType, setFuelType: setSelectedFuelType } =
    useFuelType();

  const [selectedMonth, setSelectedMonth] = useState<string | null>(
    availableMonths.length > 0 ? availableMonths[0].date : null,
  );

  const handleFuelTypeChange = (fuelType: FuelType) => {
    setSelectedFuelType(fuelType);
  };

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
  };

  if (availableMonths.length === 0) {
    return (
      <div className="card text-center py-8">
        <p className="text-secondary">{t.statistics.noMonthsAvailable}</p>
      </div>
    );
  }

  return (
    <StackLayout>
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
    </StackLayout>
  );
};

export default StatsContent;
