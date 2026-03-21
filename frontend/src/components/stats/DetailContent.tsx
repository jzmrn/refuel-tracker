import React, {
  Suspense,
  useState,
  useEffect,
  startTransition,
  useMemo,
} from "react";
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
  useDetailData: (fuelType: FuelType, months: number) => { data: T[] };
  mapToDetail: (item: T) => DetailAggregate;
  chartLabels: ChartLabels;
}

/**
 * Inner component that fetches data using suspense hooks and renders charts.
 * Only mounted inside a <Suspense> boundary.
 */
function DetailCharts<T>({
  useDetailData,
  mapToDetail,
  chartLabels,
  selectedFuelType,
  selectedMonths,
}: {
  useDetailData: DetailContentProps<T>["useDetailData"];
  mapToDetail: DetailContentProps<T>["mapToDetail"];
  chartLabels: ChartLabels;
  selectedFuelType: FuelType;
  selectedMonths: number;
}) {
  const { t } = useTranslation();

  const { data: rawData } = useDetailData(selectedFuelType, selectedMonths);

  const detailData = useMemo(
    () => rawData.map(mapToDetail),
    [rawData, mapToDetail],
  );

  if (detailData.length === 0) {
    return (
      <div className="card text-center py-8">
        <p className="text-secondary">{t.statistics.noDataAvailable}</p>
      </div>
    );
  }

  return (
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
  );
}

export default function DetailContent<T>({
  storageKeyPrefix,
  useDetailData,
  mapToDetail,
  chartLabels,
}: DetailContentProps<T>) {
  const fuelTypeKey = `${storageKeyPrefix}.fuelType`;
  const monthsKey = `${storageKeyPrefix}.months`;

  const [selectedFuelType, setSelectedFuelType] = useState<FuelType>("e5");
  const [selectedMonths, setSelectedMonths] = useState<number>(3);

  // Restore persisted selections on mount
  useEffect(() => {
    startTransition(() => {
      const storedFuel = localStorage.getItem(fuelTypeKey);
      if (
        storedFuel === "e5" ||
        storedFuel === "e10" ||
        storedFuel === "diesel"
      ) {
        setSelectedFuelType(storedFuel);
      }

      const storedMonths = localStorage.getItem(monthsKey);
      if (storedMonths === "3" || storedMonths === "12") {
        setSelectedMonths(parseInt(storedMonths, 10));
      }
    });
  }, [fuelTypeKey, monthsKey]);

  const handleFuelTypeChange = (fuelType: FuelType) => {
    setSelectedFuelType(fuelType);
    localStorage.setItem(fuelTypeKey, fuelType);
  };

  const handleMonthsChange = (months: number) => {
    setSelectedMonths(months);
    localStorage.setItem(monthsKey, String(months));
  };

  return (
    <div className="space-y-6">
      <TimeRangeFuelTypeFilter
        selectedFuelType={selectedFuelType}
        onFuelTypeChange={handleFuelTypeChange}
        selectedMonths={selectedMonths}
        onMonthsChange={handleMonthsChange}
      />

      <Suspense fallback={<LoadingSpinner />}>
        <DetailCharts
          useDetailData={useDetailData}
          mapToDetail={mapToDetail}
          chartLabels={chartLabels}
          selectedFuelType={selectedFuelType}
          selectedMonths={selectedMonths}
        />
      </Suspense>
    </div>
  );
}
