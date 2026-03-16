import { useState } from "react";
import { useRouter } from "next/router";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useTranslation, useLocalization } from "@/lib/i18n/LanguageContext";
import {
  useCarWithMinLoadTime,
  useKilometerEntriesWithMinLoadTime,
} from "@/lib/hooks/useCars";
import KilometerStatsContent from "@/components/cars/KilometerStatsContent";
import PeriodFilter from "@/components/common/PeriodFilter";

type FilterType = "month" | "6months" | "all";

export default function KilometerStats() {
  const { t } = useTranslation();
  const { formatDate } = useLocalization();
  const router = useRouter();
  const { id } = router.query;
  const carId = typeof id === "string" ? id : undefined;

  // Fetch car details
  const {
    data: car,
    isLoading: carLoading,
    isError,
  } = useCarWithMinLoadTime(carId);

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

  // Fetch kilometer entries with current filter
  const { data: kilometerEntries = [], isLoading: kilometersLoading } =
    useKilometerEntriesWithMinLoadTime(carId, {
      ...getFilterDates(),
      limit: 1000,
    });

  const handleBack = () => {
    router.back();
  };

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
  };

  // Prepare chart data - sort by timestamp ascending for the chart
  const chartData = [...kilometerEntries]
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    )
    .map((entry) => ({
      timestamp: new Date(entry.timestamp).getTime(),
      total_kilometers: entry.total_kilometers,
      displayDate: formatDate(new Date(entry.timestamp), {
        month: "short",
        day: "numeric",
        year: "2-digit",
      }),
    }));

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 md:py-8">
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

        <KilometerStatsContent
          chartData={chartData}
          isLoading={carLoading || kilometersLoading}
          isError={isError}
        />
      </div>
    </div>
  );
}
