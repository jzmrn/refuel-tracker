import { Suspense, useState } from "react";
import { useRouter } from "next/router";
import RefuelStats from "@/components/refuels/RefuelStats";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import {
  useCar,
  useRefuelMetrics,
  useRefuelStatistics,
} from "@/lib/hooks/useCars";
import {
  LoadingSpinner,
  DynamicPage,
  PageHeader,
  StackLayout,
} from "@/components/common";
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
    },
    { value: "year" as const, label: t.navigation.lastYear },
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
      <PageHeader
        title={t.common.statistics}
        subtitle={car ? `${car.name} (${car.year})` : undefined}
        onBack={handleBack}
      />

      <StackLayout>
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
      </StackLayout>
    </>
  );
}

export default function CarStats() {
  return <DynamicPage>{(carId) => <StatsContent carId={carId} />}</DynamicPage>;
}
