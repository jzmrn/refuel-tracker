import { useState, useRef, useCallback, useMemo, Suspense } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import {
  useInfiniteKilometerEntries,
  useKilometerFilterOptions,
} from "@/lib/hooks/useCars";
import { KilometerEntry } from "@/lib/api";
import {
  PageHeader,
  EmptyPanel,
  LoadingSpinner,
  PageContainer,
  StandardCard,
} from "@/components/common";
import CarPageHeader from "@/components/cars/CarPageHeader";
import { FilterPanel, FilterRow } from "@/components/common/FilterCard";
import YearSelector from "@/components/common/YearSelector";
import KilometerList from "@/components/refuels/KilometerList";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import AddIcon from "@mui/icons-material/Add";
import SpeedIcon from "@mui/icons-material/Speed";
import ListIcon from "@mui/icons-material/List";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

function AllDistanceContent({ carId }: { carId: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: filterOptions, isLoading: loadingFilterOptions } =
    useKilometerFilterOptions(carId);

  // Filter state
  const [yearFilter, setYearFilter] = useState<number | null>(null);

  // Build query params for infinite query
  const queryParams = useMemo(
    () => ({
      year: yearFilter || undefined,
    }),
    [yearFilter],
  );

  // Infinite query for kilometer entries
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteKilometerEntries(carId, queryParams);

  // Flatten pages into single array
  const entries = useMemo(() => {
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

  const handleAddEntry = () => {
    router.push(`/cars/${carId}/distance/add`);
  };

  const handleEditEntry = (entry: KilometerEntry) => {
    const encodedTimestamp = encodeURIComponent(entry.timestamp);
    router.push(`/cars/${carId}/distance/edit/${encodedTimestamp}`);
  };

  // Build collapsed summary for filter panel
  const collapsedSummary = useMemo(() => {
    const parts: string[] = [];
    if (yearFilter) {
      parts.push(String(yearFilter));
    }
    return parts;
  }, [yearFilter]);

  return (
    <>
      {/* Filters */}
      <FilterPanel
        title={t.common.filter}
        icon={<FilterAltIcon className="icon-sm" />}
        collapsedSummary={collapsedSummary}
        storageKey="distance-all-filters"
        className="mb-4"
      >
        {/* Year filter */}
        <FilterRow label={t.refuels.year}>
          <YearSelector
            selectedYear={yearFilter}
            onYearChange={setYearFilter}
            availableYears={filterOptions?.years ?? []}
          />
        </FilterRow>
      </FilterPanel>

      {/* Distance list */}
      {isLoading ? (
        <LoadingSpinner text={t.common.loading} />
      ) : isError ? (
        <EmptyPanel
          icon={
            <ErrorOutlineIcon className="icon-xl text-gray-400 dark:text-gray-500 mb-3" />
          }
          title={t.kilometers.errorLoadingEntries}
        />
      ) : entries.length === 0 ? (
        <EmptyPanel
          icon={
            <SpeedIcon className="icon-xl text-gray-400 dark:text-gray-500 mb-3" />
          }
          title={t.kilometers.noEntriesYet}
          actions={
            <button onClick={handleAddEntry} className="btn-primary">
              {t.kilometers.addKilometer}
            </button>
          }
        />
      ) : (
        <StandardCard
          title={t.common.entries}
          icon={<ListIcon className="icon-sm" />}
          headerAction={<span className="heading-3">{totalCount}</span>}
        >
          <KilometerList
            entries={entries}
            onRowClick={handleEditEntry}
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
        </StandardCard>
      )}
    </>
  );
}

// Page content component
function AllDistancePageContent({ carId }: { carId: string }) {
  const { t } = useTranslation();
  const router = useRouter();

  const handleBack = () => {
    router.push(`/cars/${carId}`);
  };

  const handleAddEntry = () => {
    router.push(`/cars/${carId}/distance/add`);
  };

  return (
    <>
      {/* Header with car data - inside Suspense */}
      <Suspense
        fallback={
          <PageHeader
            title={t.kilometers.allEntries}
            onBack={handleBack}
            actions={
              <button
                onClick={handleAddEntry}
                className="btn-icon"
                title={t.kilometers.addKilometer}
              >
                <AddIcon />
              </button>
            }
          />
        }
      >
        <CarPageHeader
          carId={carId}
          title={t.kilometers.allEntries}
          onBack={handleBack}
          actions={
            <button
              onClick={handleAddEntry}
              className="btn-icon"
              title={t.kilometers.addKilometer}
            >
              <AddIcon />
            </button>
          }
        />
      </Suspense>

      {/* Content - inside separate Suspense */}
      <Suspense fallback={<LoadingSpinner />}>
        <AllDistanceContent carId={carId} />
      </Suspense>
    </>
  );
}

// Outer wrapper that waits for router to be ready
export default function AllDistance() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = router.query;
  const carId = typeof id === "string" ? id : undefined;

  if (!router.isReady || !carId) {
    return (
      <PageContainer>
        <PageHeader
          title={t.kilometers.allEntries}
          onBack={() => router.back()}
        />
        <LoadingSpinner />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <AllDistancePageContent carId={carId} />
    </PageContainer>
  );
}
