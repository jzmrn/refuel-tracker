import React, { Suspense, useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useFuelType } from "@/lib/fuelType";
import { FuelType } from "@/lib/api";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { StackLayout } from "@/components/common";
import StatsFilters, {
  OverviewDataSource,
} from "@/components/stats/StatsFilters";
import StatsAggregateTables from "@/components/stats/StatsAggregateTables";
import {
  useAvailableMonths,
  useFavoriteEntities,
  useMonthlyStationAggregates,
  useMonthlyPlaceAggregates,
  useMonthlyBrandAggregates,
} from "@/lib/hooks/useStats";

const STORAGE_KEY = "statsOverview_dataSource";

function getStoredDataSource(): OverviewDataSource {
  if (typeof window === "undefined") return "favourites";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "top" || stored === "favourites") return stored;
  return "favourites";
}

/**
 * Inner component that fetches aggregate data using suspense hooks.
 * Applies entity filters when in "favourites" mode.
 */
function StatsAggregateData({
  selectedMonth,
  selectedFuelType,
  dataSource,
}: {
  selectedMonth: string;
  selectedFuelType: FuelType;
  dataSource: OverviewDataSource;
}) {
  const { data: favorites } = useFavoriteEntities();

  const stationFilter =
    dataSource === "favourites" && favorites.station_ids.length > 0
      ? favorites.station_ids
      : undefined;
  const brandFilter =
    dataSource === "favourites" && favorites.brands.length > 0
      ? favorites.brands
      : undefined;
  const placeFilter =
    dataSource === "favourites" && favorites.places.length > 0
      ? favorites.places
      : undefined;

  const { data: stations } = useMonthlyStationAggregates(
    selectedMonth,
    selectedFuelType,
    10,
    stationFilter,
  );

  const { data: places } = useMonthlyPlaceAggregates(
    selectedMonth,
    selectedFuelType,
    10,
    placeFilter,
  );

  const { data: brands } = useMonthlyBrandAggregates(
    selectedMonth,
    selectedFuelType,
    10,
    brandFilter,
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

  const [dataSource, setDataSource] =
    useState<OverviewDataSource>(getStoredDataSource);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, dataSource);
  }, [dataSource]);

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
        dataSource={dataSource}
        onDataSourceChange={setDataSource}
      />

      {selectedMonth && (
        <Suspense fallback={<LoadingSpinner />}>
          <StatsAggregateData
            selectedMonth={selectedMonth}
            selectedFuelType={selectedFuelType}
            dataSource={dataSource}
          />
        </Suspense>
      )}
    </StackLayout>
  );
};

export default StatsContent;
