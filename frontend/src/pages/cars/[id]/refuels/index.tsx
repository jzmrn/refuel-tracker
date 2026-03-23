import { Suspense, useState } from "react";
import { useRouter } from "next/router";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RefuelStats from "@/components/refuels/RefuelStats";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import {
  useCar,
  useRefuelMetrics,
  useRefuelStatistics,
} from "@/lib/hooks/useCars";
import { LoadingSpinner } from "@/components/common";
import PeriodFilter from "@/components/common/PeriodFilter";

type FilterType = "6months" | "year";

function StatsContent({ carId }: { carId: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: car } = useCar(carId);

  const [activeFilter, setActiveFilter] = useState<FilterType>("6months");

  const filterOptions = [
    {
      value: "6months" as const,
      label: t.navigation.lastSixMonths,
      shortLabel: "6M",
    },
    { value: "year" as const, label: t.navigation.lastYear, shortLabel: "1Y" },
  ];

  // Calculate date filters
  const getFilterDates = () => {
    const now = new Date();
    let startDate: string | undefined;

    if (activeFilter === "6months") {
      const sixMonthsAgo = new Date(now);
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      startDate = sixMonthsAgo.toISOString().split("T")[0];
    } else if (activeFilter === "year") {
      const oneYearAgo = new Date(now);
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      startDate = oneYearAgo.toISOString().split("T")[0];
    }

    return { start_date: startDate };
  };

  const handleBack = () => {
    router.back();
  };

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
  };

  return (
    <>
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={handleBack}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={t.common.back}
          >
            <ArrowBackIcon className="icon text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex-1">
            <h1 className="heading-1">{t.common.statistics}</h1>
            {car && (
              <p className="text-sm text-secondary mt-1">
                {car.name} ({car.year})
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Filter Options */}
        <PeriodFilter
          selectedPeriod={activeFilter}
          onPeriodChange={handleFilterChange}
          options={filterOptions}
        />

        {/* Statistics */}
        <Suspense fallback={<LoadingSpinner />}>
          <RefuelStats
            carId={carId}
            filterDates={getFilterDates()}
            fuelTankSize={car?.fuel_tank_size}
          />
        </Suspense>
      </div>
    </>
  );
}

export default function CarStats() {
  const router = useRouter();
  const { id } = router.query;
  const carId = typeof id === "string" ? id : undefined;

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 md:py-8">
      <Suspense fallback={<LoadingSpinner />}>
        {carId ? <StatsContent carId={carId} /> : <LoadingSpinner />}
      </Suspense>
    </div>
  );
}
