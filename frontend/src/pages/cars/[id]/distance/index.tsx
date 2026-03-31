import { Suspense, useState } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useCar } from "@/lib/hooks/useCars";
import KilometerStatsContent from "@/components/cars/KilometerStatsContent";
import PeriodFilter from "@/components/common/PeriodFilter";
import {
  LoadingSpinner,
  DynamicPage,
  PageHeader,
  StackLayout,
} from "@/components/common";

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
      <PageHeader
        title={t.kilometers.kilometerHistory}
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

        <Suspense fallback={<LoadingSpinner />}>
          <KilometerStatsContent
            carId={carId}
            filterDates={filterDates}
            aggregation={activeFilter === "6months" ? "monthly" : "yearly"}
          />
        </Suspense>
      </StackLayout>
    </>
  );
}

export default function KilometerStats() {
  return (
    <DynamicPage>
      {(carId) => <KilometerStatsInner carId={carId} />}
    </DynamicPage>
  );
}
