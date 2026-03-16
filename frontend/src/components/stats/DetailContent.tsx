import React, { useState, useMemo } from "react";
import { FuelType } from "@/lib/api";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { StandardCard } from "@/components/common";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import TimeRangeFuelTypeFilter from "@/components/fuel/TimeRangeFuelTypeFilter";
import AvgPriceChart from "@/components/stats/AvgPriceChart";
import VarianceChart from "@/components/stats/VarianceChart";
import PriceActivityChart from "@/components/stats/PriceActivityChart";
import { DetailAggregate } from "@/components/stats/chartUtils";
import PlaceIcon from "@mui/icons-material/Place";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import SwapVertIcon from "@mui/icons-material/SwapVert";

interface ChartLabels {
  avgPrice: string;
  variance: string;
  activity: string;
}

interface DetailContentProps<T> {
  storageKeyPrefix: string;
  useDetailData: (
    fuelType: FuelType,
    months: number,
  ) => { data: T[] | undefined; isLoading: boolean };
  mapToDetail: (item: T) => DetailAggregate;
  chartLabels: ChartLabels;
}

export default function DetailContent<T>({
  storageKeyPrefix,
  useDetailData,
  mapToDetail,
  chartLabels,
}: DetailContentProps<T>) {
  const { t } = useTranslation();

  const fuelTypeKey = `${storageKeyPrefix}.fuelType`;
  const monthsKey = `${storageKeyPrefix}.months`;

  const [selectedFuelType, setSelectedFuelType] = useState<FuelType>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(fuelTypeKey);
      if (stored === "e5" || stored === "e10" || stored === "diesel") {
        return stored;
      }
    }
    return "e5";
  });

  const [selectedMonths, setSelectedMonths] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(monthsKey);
      if (stored === "3" || stored === "12") {
        return parseInt(stored, 10);
      }
    }
    return 3;
  });

  const handleFuelTypeChange = (fuelType: FuelType) => {
    setSelectedFuelType(fuelType);
    localStorage.setItem(fuelTypeKey, fuelType);
  };

  const handleMonthsChange = (months: number) => {
    setSelectedMonths(months);
    localStorage.setItem(monthsKey, String(months));
  };

  const { data: rawData = [], isLoading } = useDetailData(
    selectedFuelType,
    selectedMonths,
  );

  const detailData = useMemo(
    () => rawData.map(mapToDetail),
    [rawData, mapToDetail],
  );

  return (
    <div className="space-y-6">
      <TimeRangeFuelTypeFilter
        selectedFuelType={selectedFuelType}
        onFuelTypeChange={handleFuelTypeChange}
        selectedMonths={selectedMonths}
        onMonthsChange={handleMonthsChange}
      />

      {isLoading ? (
        <LoadingSpinner text={t.common.loading} />
      ) : detailData.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-secondary">{t.statistics.noDataAvailable}</p>
        </div>
      ) : (
        <>
          <StandardCard
            title={chartLabels.avgPrice}
            icon={
              <PlaceIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            }
            iconBackground="orange"
          >
            <AvgPriceChart data={detailData} />
          </StandardCard>

          <StandardCard
            title={chartLabels.variance}
            icon={
              <TrendingDownIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            }
            iconBackground="purple"
          >
            <VarianceChart data={detailData} />
          </StandardCard>

          <StandardCard
            title={chartLabels.activity}
            icon={
              <SwapVertIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            }
            iconBackground="indigo"
          >
            <PriceActivityChart data={detailData} />
          </StandardCard>
        </>
      )}
    </div>
  );
}
