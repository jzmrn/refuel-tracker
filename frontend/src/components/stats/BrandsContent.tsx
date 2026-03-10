import React, { useCallback } from "react";
import { BrandDetailAggregate } from "@/lib/api";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useBrandDetailsWithMinLoadTime } from "@/lib/hooks/useStats";
import { DetailAggregate } from "@/components/stats/chartUtils";
import DetailContent from "@/components/stats/DetailContent";

const mapBrandToDetail = (item: BrandDetailAggregate): DetailAggregate => ({
  date: item.date,
  entity: item.brand,
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
});

const BrandsContent: React.FC = () => {
  const { t } = useTranslation();

  const useDetailData = useCallback(
    (
      fuelType: Parameters<typeof useBrandDetailsWithMinLoadTime>[0],
      months: number,
    ) => useBrandDetailsWithMinLoadTime(fuelType, months),
    [],
  );

  return (
    <DetailContent
      storageKeyPrefix="brandsDetails"
      useDetailData={useDetailData}
      mapToDetail={mapBrandToDetail}
      chartLabels={{
        avgPrice: t.statistics.avgPriceByBrand,
        variance: t.statistics.priceVarianceByBrand,
        activity: t.statistics.priceActivityByBrand,
      }}
    />
  );
};

export default BrandsContent;
