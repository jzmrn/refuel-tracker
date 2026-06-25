import React, { useCallback } from "react";
import { PlaceDetailAggregate, FuelType } from "@/lib/api";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { usePlaceDetails, useAvailablePlaces } from "@/lib/hooks/useStats";
import { FilterMultiSelectOption } from "@/components/common/FilterMultiSelect";
import { DetailAggregate } from "@/components/stats/chartUtils";
import DetailContent from "@/components/stats/DetailContent";

const mapPlaceToDetail = (item: PlaceDetailAggregate): DetailAggregate => ({
  date: item.date,
  entity: item.place,
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

const PlacesContent: React.FC = () => {
  const { t } = useTranslation();

  const useDetailData = useCallback(
    (fuelType: FuelType, months: number, entityFilter?: string[]) =>
      usePlaceDetails(fuelType, months, 10, entityFilter),
    [],
  );

  const useAvailableEntitiesHook = useCallback(() => {
    const { data } = useAvailablePlaces();
    const options: FilterMultiSelectOption[] = data.map((p) => ({
      value: p.place,
      label: p.place,
    }));
    return { data: options };
  }, []);

  return (
    <DetailContent
      storageKeyPrefix="placesDetails"
      entityType="place"
      useDetailData={useDetailData}
      useAvailableEntities={useAvailableEntitiesHook}
      mapToDetail={mapPlaceToDetail}
      chartLabels={{
        avgPrice: t.statistics.avgPriceByPlace,
        variance: t.statistics.priceVarianceByPlace,
        activity: t.statistics.priceActivityByPlace,
        priceIncreased: t.statistics.priceIncreasedByPlace,
        priceDecreased: t.statistics.priceDecreasedByPlace,
      }}
    />
  );
};

export default PlacesContent;
