import { useState } from "react";
import { useRouter } from "next/router";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Panel from "@/components/common/Panel";
import RefuelStats from "@/components/refuels/RefuelStats";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import {
  useCarWithMinLoadTime,
  useRefuelMetricsWithMinLoadTime,
  useRefuelStatisticsWithMinLoadTime,
} from "@/lib/hooks/useCars";
import CircularProgress from "@mui/material/CircularProgress";

type FilterType = "month" | "6months" | "year";

export default function CarStats() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = router.query;
  const carId = typeof id === "string" ? id : undefined;

  // Fetch car details
  const {
    data: car,
    isLoading: carLoading,
    error: carError,
  } = useCarWithMinLoadTime(carId);

  const [activeFilter, setActiveFilter] = useState<FilterType>("month");

  // Calculate date filters
  const getFilterDates = () => {
    const now = new Date();
    let startDate: string | undefined;

    if (activeFilter === "month") {
      const lastMonth = new Date(now);
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      startDate = lastMonth.toISOString().split("T")[0];
    } else if (activeFilter === "6months") {
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

  // Fetch refuels with current filter
  const { data: refuels = [], isLoading: refuelsLoading } =
    useRefuelMetricsWithMinLoadTime(carId, {
      ...getFilterDates(),
      limit: 365,
    });

  // Fetch statistics with current filter
  const { data: statistics, isLoading: statsLoading } =
    useRefuelStatisticsWithMinLoadTime(carId, getFilterDates());

  const handleBack = () => {
    router.back();
  };

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
  };

  if (carError) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-4 md:py-8">
        <Panel>
          <p className="text-red-600 dark:text-red-400">
            {t.cars.failedToLoadCar}
          </p>
        </Panel>
      </div>
    );
  }

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
            <h1 className="heading-1">{t.refuels.statistics}</h1>
            {car && (
              <p className="text-sm text-secondary mt-1">
                {car.name} ({car.year})
              </p>
            )}
          </div>
        </div>
      </div>

      {carLoading ? (
        <Panel>
          <div className="flex flex-col items-center gap-2">
            <CircularProgress size={20} />
            <span className="text-secondary">{t.common.loading}</span>
          </div>
        </Panel>
      ) : car ? (
        <div className="space-y-6">
          {/* Filter Options */}
          <div className="panel">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <h2 className="heading-2">{t.refuels.filter}</h2>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => handleFilterChange("month")}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeFilter === "month"
                      ? "bg-primary-50 text-primary-700 dark:bg-blue-900/20 dark:text-blue-300"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {t.refuels.lastMonth}
                </button>
                <button
                  onClick={() => handleFilterChange("6months")}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeFilter === "6months"
                      ? "bg-primary-50 text-primary-700 dark:bg-blue-900/20 dark:text-blue-300"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {t.refuels.lastSixMonths}
                </button>
                <button
                  onClick={() => handleFilterChange("year")}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeFilter === "year"
                      ? "bg-primary-50 text-primary-700 dark:bg-blue-900/20 dark:text-blue-300"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {t.refuels.lastYear}
                </button>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <RefuelStats
            statistics={statistics || null}
            refuelData={refuels}
            loading={statsLoading || refuelsLoading}
          />
        </div>
      ) : null}
    </div>
  );
}
