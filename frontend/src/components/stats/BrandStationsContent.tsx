import React, { useCallback, useMemo } from "react";
import {
  StationDetailAggregate,
  BrandDetailAggregate,
  FuelType,
} from "@/lib/api";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import {
  useStationDetails,
  useAvailableStations,
  useBrandDetails,
} from "@/lib/hooks/useStats";
import { FilterMultiSelectOption } from "@/components/common/FilterMultiSelect";
import { DetailAggregate } from "@/components/stats/chartUtils";
import DetailContent from "@/components/stats/DetailContent";

const mapStationToDetail = (item: StationDetailAggregate): DetailAggregate => {
  const address = [item.street, item.house_number].filter(Boolean).join(" ");
  const label = item.place
    ? address
      ? `${item.place} (${address})`
      : item.place
    : item.station_name || item.station_id;
  return {
    date: item.date,
    entity: label,
    price_mean: item.price_mean,
    price_min: item.price_min,
    price_max: item.price_max,
    price_std: item.price_std,
    n_stations: item.n_stations,
    n_price_changes: item.n_price_changes,
    n_unique_prices: item.n_unique_prices,
    n_days: item.n_days,
    price_changes_per_station_day: item.price_changes_per_station_day,
    unique_prices_per_station_day: item.unique_prices_per_station_day,
    price_increased_per_station_day: item.price_increased_per_station_day,
    price_decreased_per_station_day: item.price_decreased_per_station_day,
  };
};

const mapBrandToDetail = (item: BrandDetailAggregate): DetailAggregate => ({
  date: item.date,
  entity: `⌀ ${item.brand}`,
  price_mean: item.price_mean,
  price_min: item.price_min,
  price_max: item.price_max,
  price_std: item.price_std,
  n_stations: item.n_stations,
  n_price_changes: item.n_price_changes,
  n_unique_prices: item.n_unique_prices,
  n_days: item.n_days,
  price_changes_per_station_day: item.price_changes_per_station_day,
  unique_prices_per_station_day: item.unique_prices_per_station_day,
  price_increased_per_station_day: item.price_increased_per_station_day,
  price_decreased_per_station_day: item.price_decreased_per_station_day,
});

interface BrandStationsContentProps {
  brand: string;
}

/**
 * Shows station-level detail charts for all stations of a given brand,
 * with a dashed overlay line for the brand average.
 */
const BrandStationsContent: React.FC<BrandStationsContentProps> = ({
  brand,
}) => {
  const { t } = useTranslation();

  // Get station IDs that belong to this brand
  const { data: allStations } = useAvailableStations();
  const brandStationIds = useMemo(
    () => allStations.filter((s) => s.brand === brand).map((s) => s.station_id),
    [allStations, brand],
  );

  const useDetailData = useCallback(
    (fuelType: FuelType, months: number, entityFilter?: string[]) => {
      const ids = entityFilter
        ? entityFilter.filter((id) => brandStationIds.includes(id))
        : brandStationIds;
      return useStationDetails(
        fuelType,
        months,
        100,
        ids.length > 0 ? ids : brandStationIds,
      );
    },
    [brandStationIds],
  );

  const useAvailableEntitiesHook = useCallback(() => {
    const options: FilterMultiSelectOption[] = allStations
      .filter((s) => s.brand === brand)
      .map((s) => ({
        value: s.station_id,
        label: s.place || s.name || s.station_id,
      }));
    return { data: options };
  }, [allStations, brand]);

  const useOverlayData = useCallback(
    (fuelType: FuelType, months: number) => {
      const { data } = useBrandDetails(fuelType, months, 1, [brand]);
      return { data: data.map(mapBrandToDetail) };
    },
    [brand],
  );

  return (
    <DetailContent
      storageKeyPrefix={`brandStations.${brand}`}
      entityType="station"
      useDetailData={useDetailData}
      useAvailableEntities={useAvailableEntitiesHook}
      mapToDetail={mapStationToDetail}
      chartLabels={{
        avgPrice: t.statistics.avgPriceByStation,
        variance: t.statistics.priceVarianceByStation,
        activity: t.statistics.priceActivityByStation,
        priceIncreased: t.statistics.priceIncreasedByStation,
        priceDecreased: t.statistics.priceDecreasedByStation,
      }}
      useOverlayData={useOverlayData}
      defaultDataSourceMode="all"
      enableAllOnInit
    />
  );
};

export default BrandStationsContent;
