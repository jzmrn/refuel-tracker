import React, { useCallback } from "react";
import { StationDetailAggregate } from "@/lib/api";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useStationDetails } from "@/lib/hooks/useStats";
import { DetailAggregate } from "@/components/stats/chartUtils";
import DetailContent from "@/components/stats/DetailContent";

const mapStationToDetail = (item: StationDetailAggregate): DetailAggregate => ({
  date: item.date,
  entity: item.brand
    ? item.place
      ? `${item.brand} (${item.place})`
      : item.brand
    : item.station_name || item.station_id,
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

const StationsContent: React.FC = () => {
  const { t } = useTranslation();

  const useDetailData = useCallback(
    (fuelType: Parameters<typeof useStationDetails>[0], months: number) =>
      useStationDetails(fuelType, months),
    [],
  );

  return (
    <DetailContent
      storageKeyPrefix="stationsDetails"
      useDetailData={useDetailData}
      mapToDetail={mapStationToDetail}
      chartLabels={{
        avgPrice: t.statistics.avgPriceByStation,
        variance: t.statistics.priceVarianceByStation,
        activity: t.statistics.priceActivityByStation,
        priceIncreased: t.statistics.priceIncreasedByStation,
        priceDecreased: t.statistics.priceDecreasedByStation,
      }}
    />
  );
};

export default StationsContent;
