import { useState, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import { useTranslation, useLocalization } from "@/lib/i18n/LanguageContext";
import {
  useCar,
  useInfiniteRefuelMetrics,
  useRefuelFilterOptions,
} from "@/lib/hooks/useCars";
import { RefuelMetric } from "@/lib/api";
import {
  PageHeader,
  EmptyPanel,
  LoadingSpinner,
  PageContainer,
  StandardCard,
} from "@/components/common";
import { FilterPanel, FilterRow } from "@/components/common/FilterCard";
import FilterSelect from "@/components/common/FilterSelect";
import YearSelector from "@/components/common/YearSelector";
import { renderSvgFuelPrice } from "@/lib/formatPrice";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import SortIcon from "@mui/icons-material/Sort";
import AddIcon from "@mui/icons-material/Add";
import LocalGasStationIcon from "@mui/icons-material/LocalGasStation";
import ListIcon from "@mui/icons-material/List";
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
  const { formatDate: formatDateLocalized } = useLocalization();
  const router = useRouter();
  const { data: car } = useCar(carId);
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

  const handleBack = () => {
    router.push(`/cars/${carId}`);
  };

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

  // Format helpers
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const formatLiters = (liters: number) => {
    return `${liters.toFixed(2)} L`;
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
      <PageHeader
        title={t.refuels.allRefuels || "All Refuels"}
        subtitle={car ? `${car.name} (${car.year})` : undefined}
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

      {/* Filters */}
      <FilterPanel
        title={t.common.filter}
        icon={<FilterAltIcon className="icon-sm" />}
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
        <FilterRow label={t.refuels.year || "Year"}>
          <YearSelector
            selectedYear={yearFilter}
            onYearChange={setYearFilter}
            availableYears={filterOptions?.years ?? []}
          />
        </FilterRow>
      </FilterPanel>

      {/* Sort controls */}
      <FilterPanel
        title={t.refuels.sortBy || "Sort by"}
        icon={<SortIcon className="icon-sm" />}
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
        <StandardCard
          title={t.common.entries}
          icon={<ListIcon className="icon-sm" />}
          headerAction={<span className="heading-3">{totalCount}</span>}
        >
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-1 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    {t.refuels.dateHeader}
                  </th>
                  <th className="px-1 sm:px-2 lg:px-4 py-2 sm:py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider hidden xl:table-cell">
                    {t.refuels.station}
                  </th>
                  <th className="px-1 sm:px-2 lg:px-4 py-2 sm:py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider hidden lg:table-cell">
                    {t.refuels.kmHeader}
                  </th>
                  <th className="px-1 sm:px-2 lg:px-4 py-2 sm:py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider hidden md:table-cell">
                    L/100km
                  </th>
                  <th className="px-1 sm:px-2 lg:px-4 py-2 sm:py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    €/L
                  </th>
                  <th className="px-1 sm:px-2 lg:px-4 py-2 sm:py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    {t.refuels.litersHeader}
                  </th>
                  <th className="px-1 sm:px-2 lg:px-4 py-2 sm:py-3 text-right text-xs font-medium text-secondary uppercase tracking-wider">
                    {t.refuels.totalHeader}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {refuels.map((refuel) => {
                  const totalCost = refuel.price * refuel.amount;
                  const consumption =
                    (refuel.amount / refuel.kilometers_since_last_refuel) * 100;
                  const refuelDate = new Date(refuel.timestamp);
                  const now = new Date();
                  const isToday =
                    refuelDate.toDateString() === now.toDateString();

                  return (
                    <tr
                      key={refuel.timestamp}
                      onClick={() => handleEditRefuel(refuel)}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                        isToday ? "bg-blue-50/30 dark:bg-blue-900/20" : ""
                      }`}
                    >
                      <td className="px-1 sm:px-3 lg:px-6 py-2 sm:py-3 lg:py-4 text-xs sm:text-sm text-primary">
                        <div className="font-medium">
                          {formatDateLocalized(new Date(refuel.timestamp), {
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDateLocalized(new Date(refuel.timestamp), {
                            year: "numeric",
                          })}
                        </div>
                      </td>
                      <td className="px-1 sm:px-2 lg:px-4 py-2 sm:py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-secondary hidden xl:table-cell">
                        {refuel.station_brand || "—"}
                      </td>
                      <td className="px-1 sm:px-2 lg:px-4 py-2 sm:py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-primary hidden lg:table-cell">
                        {refuel.kilometers_since_last_refuel.toFixed(0)}
                      </td>
                      <td className="px-1 sm:px-2 lg:px-4 py-2 sm:py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-primary hidden md:table-cell">
                        <div className="font-medium">
                          {consumption.toFixed(1)}
                        </div>
                      </td>
                      <td className="px-1 sm:px-2 lg:px-4 py-2 sm:py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-primary font-medium">
                        {renderSvgFuelPrice(refuel.price, {
                          showCurrency: false,
                        })}
                      </td>
                      <td className="px-1 sm:px-2 lg:px-4 py-2 sm:py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-primary font-medium">
                        {formatLiters(refuel.amount)}
                      </td>
                      <td className="px-1 sm:px-2 lg:px-4 py-2 sm:py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm font-bold text-primary text-right">
                        {formatCurrency(totalCost)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Load more trigger element */}
          {hasNextPage && (
            <div ref={loadMoreRef} className="py-4 flex justify-center">
              {isFetchingNextPage ? (
                <LoadingSpinner text={t.common.loading} />
              ) : (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {t.navigation.showAll || "Scroll for more"}
                </span>
              )}
            </div>
          )}
        </StandardCard>
      )}
    </>
  );
}

export default function AllRefuels() {
  const router = useRouter();
  const { id: carId } = router.query;

  if (!carId || typeof carId !== "string") {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[50vh]">
          <LoadingSpinner />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <AllRefuelsContent carId={carId} />
    </PageContainer>
  );
}
