import React, { useCallback, useMemo } from "react";
import {
  StationDetailAggregate,
  PlaceDetailAggregate,
  FuelType,
} from "@/lib/api";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import {
  useStationDetails,
  useAvailableStations,
  usePlaceDetails,
} from "@/lib/hooks/useStats";
import { FilterMultiSelectOption } from "@/components/common/FilterMultiSelect";
import { DetailAggregate } from "@/components/stats/chartUtils";
import DetailContent from "@/components/stats/DetailContent";

const mapStationToDetail = (item: StationDetailAggregate): DetailAggregate => {
  const address = [item.street, item.house_number].filter(Boolean).join(" ");
  const label = item.brand
    ? address
      ? `${item.brand} (${address})`
      : item.brand
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

const mapPlaceToDetail = (item: PlaceDetailAggregate): DetailAggregate => ({
  date: item.date,
  entity: `⌀ ${item.place}`,
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

interface PlaceStationsContentProps {
  place: string;
}

/**
 * Shows station-level detail charts for all stations in a given place,
 * with a dashed overlay line for the place average.
 */
const PlaceStationsContent: React.FC<PlaceStationsContentProps> = ({
  place,
}) => {
  const { t } = useTranslation();

  // Get station IDs that belong to this place
  const { data: allStations } = useAvailableStations();
  const placeStationIds = useMemo(
    () => allStations.filter((s) => s.place === place).map((s) => s.station_id),
    [allStations, place],
  );

  const useDetailData = useCallback(
    (fuelType: FuelType, months: number, entityFilter?: string[]) => {
      const ids = entityFilter
        ? entityFilter.filter((id) => placeStationIds.includes(id))
        : placeStationIds;
      return useStationDetails(
        fuelType,
        months,
        100,
        ids.length > 0 ? ids : placeStationIds,
      );
    },
    [placeStationIds],
  );

  const useAvailableEntitiesHook = useCallback(() => {
    const options: FilterMultiSelectOption[] = allStations
      .filter((s) => s.place === place)
      .map((s) => ({
        value: s.station_id,
        label: s.brand || s.name || s.station_id,
      }));
    return { data: options };
  }, [allStations, place]);

  const useOverlayData = useCallback(
    (fuelType: FuelType, months: number) => {
      const { data } = usePlaceDetails(fuelType, months, 1, [place]);
      return { data: data.map(mapPlaceToDetail) };
    },
    [place],
  );

  return (
    <DetailContent
      storageKeyPrefix={`placeStations.${place}`}
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

export default PlaceStationsContent;
