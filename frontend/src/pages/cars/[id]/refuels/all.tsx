import { useState, useRef, useCallback, useMemo, Suspense } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import {
  useInfiniteRefuelMetrics,
  useRefuelFilterOptions,
} from "@/lib/hooks/useCars";
import { RefuelMetric } from "@/lib/api";
import {
  PageHeader,
  EmptyPanel,
  LoadingSpinner,
  PageContainer,
  Panel,
} from "@/components/common";
import CarPageHeader from "@/components/cars/CarPageHeader";
import { FilterPanel, FilterRow } from "@/components/common/FilterCard";
import FilterSelect from "@/components/common/FilterSelect";
import YearSelector from "@/components/common/YearSelector";
import RefuelList from "@/components/refuels/RefuelList";
import SortIcon from "@mui/icons-material/Sort";
import AddIcon from "@mui/icons-material/Add";
import LocalGasStationIcon from "@mui/icons-material/LocalGasStation";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

// Sort options
type SortOption =
  | "timestamp"
  | "price"
  | "consumption"
  | "total_cost"
  | "kilometers";
type SortOrder = "asc" | "desc";

interface SortConfig {
  field: SortOption;
  order: SortOrder;
}

function AllRefuelsContent({ carId }: { carId: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: filterOptions, isLoading: loadingFilterOptions } =
    useRefuelFilterOptions(carId);

  // Filter state
  const [stationFilter, setStationFilter] = useState<string>("");
  const [fuelTypeFilter, setFuelTypeFilter] = useState<string>("");
  const [yearFilter, setYearFilter] = useState<number | null>(null);

  // Sort state
  const [sort, setSort] = useState<SortConfig>({
    field: "timestamp",
    order: "desc",
  });

  // Build query params for infinite query
  const queryParams = useMemo(
    () => ({
      sort_by: sort.field,
      sort_order: sort.order,
      station_id: stationFilter || undefined,
      fuel_type: fuelTypeFilter || undefined,
      year: yearFilter || undefined,
    }),
    [sort.field, sort.order, stationFilter, fuelTypeFilter, yearFilter],
  );

  // Infinite query for refuels
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteRefuelMetrics(carId, queryParams);

  // Flatten pages into single array
  const refuels = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.items);
  }, [data?.pages]);

  // Total count from first page
  const totalCount = data?.pages[0]?.total ?? 0;

  // Infinite scroll observer
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isFetchingNextPage) return;

      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      });

      if (node) {
        observerRef.current.observe(node);
      }
    },
    [isFetchingNextPage, hasNextPage, fetchNextPage],
  );

  const handleAddRefuel = () => {
    router.push(`/cars/${carId}/refuels/add`);
  };

  const handleEditRefuel = (refuel: RefuelMetric) => {
    const encodedTimestamp = encodeURIComponent(refuel.timestamp);
    router.push(`/cars/${carId}/refuels/edit/${encodedTimestamp}`);
  };

  const handleSortChange = (field: SortOption) => {
    setSort((prev) => ({
      field,
      // Toggle order if same field, otherwise default to desc
      order: prev.field === field && prev.order === "desc" ? "asc" : "desc",
    }));
  };

  // Build filter options for dropdowns
  const stationOptions = useMemo(() => {
    if (!filterOptions?.stations) return [];
    return filterOptions.stations.map((s) => ({
      value: s.station_id,
      label: s.brand
        ? `${s.brand}${s.place ? ` - ${s.place}` : ""}`
        : s.station_id,
    }));
  }, [filterOptions?.stations]);

  const fuelTypeOptions = useMemo(() => {
    if (!filterOptions?.fuel_types) return [];
    return filterOptions.fuel_types.map((ft) => ({
      value: ft,
      label:
        ft === "e5"
          ? "Super E5"
          : ft === "e10"
          ? "Super E10"
          : ft === "diesel"
          ? "Diesel"
          : ft,
    }));
  }, [filterOptions?.fuel_types]);

  // Build collapsed summary for filter panel
  const collapsedSummary = useMemo(() => {
    const parts: string[] = [];
    if (stationFilter) {
      const station = filterOptions?.stations.find(
        (s) => s.station_id === stationFilter,
      );
      if (station?.brand) parts.push(station.brand);
    }
    if (fuelTypeFilter) {
      parts.push(
        fuelTypeFilter === "e5"
          ? "E5"
          : fuelTypeFilter === "e10"
          ? "E10"
          : "Diesel",
      );
    }
    if (yearFilter) {
      parts.push(String(yearFilter));
    }
    return parts;
  }, [stationFilter, fuelTypeFilter, yearFilter, filterOptions?.stations]);

  // Sort options for dropdown
  const sortOptions = [
    { value: "timestamp", label: t.refuels.dateHeader },
    { value: "price", label: t.refuels.pricePerLiter },
    { value: "consumption", label: "L/100km" },
    { value: "total_cost", label: t.refuels.totalCost },
    { value: "kilometers", label: t.refuels.kmHeader },
  ];

  return (
    <>
      {/* Filters */}
      <FilterPanel
        title={t.common.filter}
        collapsedSummary={collapsedSummary}
        storageKey="refuels-all-filters"
        className="mb-4"
      >
        {/* Station filter */}
        <FilterRow label={t.refuels.station}>
          <FilterSelect
            value={stationFilter}
            onChange={setStationFilter}
            options={stationOptions}
            placeholder={t.common.all}
            disabled={loadingFilterOptions}
          />
        </FilterRow>

        {/* Fuel type filter */}
        <FilterRow label={t.cars.fuelType}>
          <FilterSelect
            value={fuelTypeFilter}
            onChange={setFuelTypeFilter}
            options={fuelTypeOptions}
            placeholder={t.common.all}
            disabled={loadingFilterOptions}
          />
        </FilterRow>

        {/* Year filter */}
        <FilterRow label={t.refuels.year}>
          <YearSelector
            selectedYear={yearFilter}
            onYearChange={setYearFilter}
            availableYears={filterOptions?.years ?? []}
          />
        </FilterRow>
      </FilterPanel>

      {/* Sort controls */}
      <FilterPanel
        title={t.refuels.sortBy}
        icon={SortIcon}
        collapsedSummary={[
          sortOptions.find((o) => o.value === sort.field)?.label || "",
        ]}
        storageKey="refuels-all-sort"
        className="mb-4"
      >
        <div className="flex items-center gap-3 flex-wrap">
          {sortOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSortChange(option.value as SortOption)}
              className={
                sort.field === option.value
                  ? "btn-toggle-active"
                  : "btn-toggle-inactive"
              }
            >
              {option.label}
              {sort.field === option.value && (
                <span className="ml-1">{sort.order === "asc" ? "↑" : "↓"}</span>
              )}
            </button>
          ))}
        </div>
      </FilterPanel>

      {/* Refuel list */}
      {isLoading ? (
        <LoadingSpinner text={t.common.loading} />
      ) : isError ? (
        <EmptyPanel
          icon={
            <ErrorOutlineIcon className="icon-xl text-gray-400 dark:text-gray-500 mb-3" />
          }
          title={t.refuels.errorLoadingData}
        />
      ) : refuels.length === 0 ? (
        <EmptyPanel
          icon={
            <LocalGasStationIcon className="icon-xl text-gray-400 dark:text-gray-500 mb-3" />
          }
          title={t.refuels.noRefuelEntriesYet}
          actions={
            <button onClick={handleAddRefuel} className="btn-primary">
              {t.refuels.addRefuel}
            </button>
          }
        />
      ) : (
        <Panel
          title={t.common.entries}
          actions={<span className="heading-3">{totalCount}</span>}
        >
          <RefuelList
            refuels={refuels}
            onRowClick={handleEditRefuel}
            hideEmptyState
          />

          {/* Load more trigger element */}
          {hasNextPage && (
            <div ref={loadMoreRef} className="py-4 flex justify-center">
              {isFetchingNextPage ? (
                <LoadingSpinner text={t.common.loading} />
              ) : (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {t.navigation.showAll}
                </span>
              )}
            </div>
          )}
        </Panel>
      )}
    </>
  );
}

// Page content component
function AllRefuelsPageContent({ carId }: { carId: string }) {
  const { t } = useTranslation();
  const router = useRouter();

  const handleBack = () => {
    router.push(`/cars/${carId}`);
  };

  const handleAddRefuel = () => {
    router.push(`/cars/${carId}/refuels/add`);
  };

  return (
    <>
      {/* Header with car data - inside Suspense */}
      <Suspense
        fallback={
          <PageHeader
            title={t.refuels.allRefuels}
            onBack={handleBack}
            actions={
              <button
                onClick={handleAddRefuel}
                className="btn-icon"
                title={t.refuels.addRefuel}
              >
                <AddIcon />
              </button>
            }
          />
        }
      >
        <CarPageHeader
          carId={carId}
          title={t.refuels.allRefuels}
          onBack={handleBack}
          actions={
            <button
              onClick={handleAddRefuel}
              className="btn-icon"
              title={t.refuels.addRefuel}
            >
              <AddIcon />
            </button>
          }
        />
      </Suspense>

      {/* Content - inside separate Suspense */}
      <Suspense fallback={<LoadingSpinner />}>
        <AllRefuelsContent carId={carId} />
      </Suspense>
    </>
  );
}

// Outer wrapper that waits for router to be ready
export default function AllRefuels() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = router.query;
  const carId = typeof id === "string" ? id : undefined;

  if (!router.isReady || !carId) {
    return (
      <PageContainer>
        <PageHeader title={t.refuels.allRefuels} onBack={() => router.back()} />
        <LoadingSpinner />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <AllRefuelsPageContent carId={carId} />
    </PageContainer>
  );
}
