import { Suspense, useState, useEffect, startTransition } from "react";
import { useRouter } from "next/router";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import TuneIcon from "@mui/icons-material/Tune";
import SearchStationsForm from "@/components/fuel-prices/SearchStationsForm";
import StationsList, {
  SortByType,
} from "@/components/fuel-prices/StationsList";
import FuelTypeSelector from "@/components/fuel/FuelTypeSelector";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import Snackbar from "@/components/common/Snackbar";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useSnackbar } from "@/lib/useSnackbar";
import { useDelayedLoading } from "@/lib/hooks/useDelayedLoading";
import {
  useFavoriteStations,
  useAddFavoriteStation,
  useRemoveFavoriteStation,
  useSearchStations,
} from "@/lib/hooks/useFuelPrices";
import {
  FuelType,
  GasStationResponse,
  GasStationSearchRequest,
} from "@/lib/api";
import {
  FilterPanel,
  FilterRow,
  LoadingSpinner,
  PageContainer,
  PageHeader,
} from "@/components/common";

export default function SearchStations() {
  const { t } = useTranslation();
  const router = useRouter();

  const [searchSortBy, setSearchSortBy] = useState<string>("dist");
  // Initialize searchParams from URL on initial load to avoid loading flash
  const [searchParams, setSearchParams] =
    useState<GasStationSearchRequest | null>(() => {
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const lat = urlParams.get("lat");
        const lng = urlParams.get("lng");
        const rad = urlParams.get("rad");
        const sortBy = urlParams.get("sortBy");

        if (lat && lng && rad) {
          return {
            lat: parseFloat(lat),
            lng: parseFloat(lng),
            rad: parseFloat(rad),
            fuel_type: "all",
            sort_by: sortBy || "dist",
            open_only: false,
          };
        }
      }
      return null;
    });
  const [isInitialized, setIsInitialized] = useState(false);
  // Initialize showingResults based on whether URL has search params
  // This prevents form flash when reloading page with results
  const [showingResults, setShowingResults] = useState(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      return (
        urlParams.has("lat") && urlParams.has("lng") && urlParams.has("rad")
      );
    }
    return false;
  });
  const { isLoading, startLoading, stopLoading } = useDelayedLoading();
  const { snackbar, showSuccess, showError, hideSnackbar } = useSnackbar();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isFormLoading = isLoading("search-submit");

  // React Query hooks for favorites (suspense-based)
  const { data: favoritesResponse } = useFavoriteStations();
  const addFavorite = useAddFavoriteStation();
  const removeFavorite = useRemoveFavoriteStation();

  // React Query hook for search results (non-suspense, requires conditional enabled)
  const { data: searchResults = [], isLoading: isLoadingResults } =
    useSearchStations(searchParams);

  const showForm = !showingResults;

  // Load search params from URL on mount
  useEffect(() => {
    if (!router.isReady) return;

    const { lat, lng, rad, sortBy } = router.query;

    if (lat && lng && rad) {
      // Update searchSortBy from URL
      setSearchSortBy((sortBy as string) || "dist");
      // searchParams and showingResults are already initialized from URL
    }
    startTransition(() => setIsInitialized(true));
  }, [router.isReady, router.query]);

  // Switch to results view and stop loading once results are available (for new searches)
  useEffect(() => {
    if (searchParams && !isLoadingResults && !showingResults && isSubmitting) {
      // Data has loaded (could be empty or with results)
      if (searchResults.length > 0) {
        startTransition(() => setShowingResults(true));
      }
      stopLoading("search-submit");
      startTransition(() => setIsSubmitting(false));
    }
    // Stop loading if we're already showing results (page reload scenario)
    // In this case isSubmitting might be false because we initialized from URL
    if (
      showingResults &&
      !isLoadingResults &&
      searchResults.length > 0 &&
      isSubmitting
    ) {
      stopLoading("search-submit");
      startTransition(() => setIsSubmitting(false));
    }
  }, [
    searchParams,
    isLoadingResults,
    searchResults.length,
    showingResults,
    isSubmitting,
  ]);

  const handleBack = () => {
    router.push("/stations");
  };

  const handleSearch = (
    results: GasStationResponse[],
    searchParams: {
      sortBy: string;
      lat: number;
      lng: number;
      rad: number;
    },
  ) => {
    const params: GasStationSearchRequest = {
      lat: searchParams.lat,
      lng: searchParams.lng,
      rad: searchParams.rad,
      fuel_type: "all",
      sort_by: searchParams.sortBy,
      open_only: false,
    };

    // Start loading with threshold
    startLoading("search-submit");
    setIsSubmitting(true);

    setSearchParams(params);
    // Don't switch to results view yet - wait for data to load
    setSearchSortBy("dist"); // Default to distance for results sorting

    // Update URL with search params to preserve state on navigation
    router.push(
      {
        pathname: "/stations/search",
        query: {
          lat: searchParams.lat,
          lng: searchParams.lng,
          rad: searchParams.rad,
          sortBy: searchParams.sortBy,
        },
      },
      undefined,
      { shallow: true },
    );
  };

  const handleSearchError = (error: string) => {
    showError(error);
  };

  const handleSortChange = (newSortBy: SortByType) => {
    setSearchSortBy(newSortBy);
  };

  const fuelTypeLabels: Record<string, string> = {
    e5: t.fuelPrices.e5,
    e10: t.fuelPrices.e10,
    diesel: t.fuelPrices.diesel,
    dist: t.fuelPrices.distance,
  };

  const handleRefineSearch = () => {
    setShowingResults(false);
    // Keep searchParams so the "Back to Results" button can show
    // Keep URL params so form can pre-fill with previous values
  };

  const handleBackToResults = () => {
    setShowingResults(true);
  };

  const handleAddToFavorites = async (stationId: string) => {
    startLoading(stationId);
    try {
      await addFavorite.mutateAsync(stationId);
    } catch (error) {
      console.error("Error adding favorite:", error);
      showError(t.fuelPrices.failedToAddFavorite);
    } finally {
      stopLoading(stationId);
    }
  };

  const handleRemoveFromFavorites = async (stationId: string) => {
    startLoading(stationId);
    try {
      await removeFavorite.mutateAsync(stationId);
    } catch (error) {
      console.error("Error removing favorite:", error);
      showError(t.fuelPrices.failedToRemoveFavorite);
    } finally {
      stopLoading(stationId);
    }
  };

  const handleNavigateToDetail = (stationId: string) => {
    router.push(`/stations/${encodeURIComponent(stationId)}`);
  };

  const favoriteIds = new Set(
    favoritesResponse.stations.map((f) => f.station_id),
  );

  return (
    <PageContainer>
      <Suspense fallback={<LoadingSpinner />}>
        {/* Header */}
        <PageHeader title={t.fuelPrices.searchStations} onBack={handleBack} />

        {/* Context action buttons */}
        {!showForm && searchResults.length > 0 && (
          <div className="-mt-4 mb-6 flex justify-end">
            <button
              onClick={handleRefineSearch}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30 transition-colors"
            >
              <TuneIcon className="w-5 h-5" />
              <span className="hidden sm:inline">{t.fuelPrices.search}</span>
            </button>
          </div>
        )}
        {showForm && searchParams !== null && searchResults.length > 0 && (
          <div className="-mt-4 mb-6 flex justify-end">
            <button
              onClick={handleBackToResults}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30 transition-colors"
            >
              <ArrowForwardIcon className="w-5 h-5" />
              <span className="hidden sm:inline">
                {t.fuelPrices.backToResults}
              </span>
            </button>
          </div>
        )}

        {/* Form or Results */}
        {!isInitialized ? (
          <div className="panel p-8 text-center">
            <p className="text-secondary">{t.common.loading}...</p>
          </div>
        ) : showForm ? (
          <SearchStationsForm
            onSearch={handleSearch}
            onError={handleSearchError}
            isSubmitting={isSubmitting}
            initialValues={{
              lat: router.query.lat
                ? parseFloat(router.query.lat as string)
                : undefined,
              lng: router.query.lng
                ? parseFloat(router.query.lng as string)
                : undefined,
              rad: router.query.rad
                ? parseFloat(router.query.rad as string)
                : undefined,
              sortBy: (router.query.sortBy as string) || undefined,
            }}
          />
        ) : (
          <>
            {/* Sort Control */}
            <FilterPanel
              title={t.fuelPrices.sortBy}
              icon={
                <FilterAltIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              }
              collapsedSummary={[fuelTypeLabels[searchSortBy]]}
              storageKey="search-sort-filter"
              className="mb-6"
            >
              <FilterRow label={t.fuelPrices.sortBy}>
                <FuelTypeSelector
                  selectedFuelType={
                    ["e5", "e10", "diesel"].includes(searchSortBy)
                      ? (searchSortBy as FuelType)
                      : null
                  }
                  onFuelTypeChange={(fuelType) =>
                    handleSortChange(fuelType as SortByType)
                  }
                  includeDistance
                  onDistanceSelect={() => handleSortChange("dist")}
                />
              </FilterRow>
            </FilterPanel>

            <StationsList
              stations={searchResults}
              loading={!searchResults || searchResults.length === 0}
              sortBy={searchSortBy as SortByType}
              onAddToFavorites={handleAddToFavorites}
              onRemoveFromFavorites={handleRemoveFromFavorites}
              isLoading={isLoading}
              onNavigateToDetail={handleNavigateToDetail}
              favoriteIds={favoriteIds}
              showRank={true}
            />
          </>
        )}

        {/* Snackbar */}
        {snackbar.isVisible && (
          <Snackbar
            message={snackbar.message}
            type={snackbar.type}
            isVisible={true}
            onClose={hideSnackbar}
          />
        )}
      </Suspense>
    </PageContainer>
  );
}
