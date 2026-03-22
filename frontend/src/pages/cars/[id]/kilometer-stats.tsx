import { Suspense, useState } from "react";
import { useRouter } from "next/router";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useCar } from "@/lib/hooks/useCars";
import KilometerStatsContent from "@/components/cars/KilometerStatsContent";
import PeriodFilter from "@/components/common/PeriodFilter";
import { LoadingSpinner } from "@/components/common";

type FilterType = "6months" | "all";

function KilometerStatsInner({ carId }: { carId: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: car } = useCar(carId);

  const [activeFilter, setActiveFilter] = useState<FilterType>("6months");

  const filterOptions = [
    {
      value: "6months" as const,
      label: t.kilometers.lastSixMonths,
      shortLabel: "6M",
    },
    { value: "all" as const, label: t.common.all },
  ];

  // Calculate date filters
  const getFilterDates = () => {
    const now = new Date();
    let startDate: string | undefined;

    if (activeFilter === "6months") {
      const sixMonthsAgo = new Date(now);
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      startDate = sixMonthsAgo.toISOString().split("T")[0];
    }
    // 'all' means no start date filter

    return { start_date: startDate };
  };

  const handleBack = () => {
    router.back();
  };

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
  };

  const filterDates = getFilterDates();

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
            <h1 className="heading-1">{t.kilometers.kilometerHistory}</h1>
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

        <Suspense fallback={<LoadingSpinner />}>
          <KilometerStatsContent
            carId={carId}
            filterDates={filterDates}
            aggregation={activeFilter === "6months" ? "monthly" : "yearly"}
          />
        </Suspense>
      </div>
    </>
  );
}

export default function KilometerStats() {
  const router = useRouter();
  const { id } = router.query;
  const carId = typeof id === "string" ? id : undefined;

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 md:py-8">
      <Suspense fallback={<LoadingSpinner />}>
        {carId ? <KilometerStatsInner carId={carId} /> : <LoadingSpinner />}
      </Suspense>
    </div>
  );
}
