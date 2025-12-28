import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import TuneIcon from "@mui/icons-material/Tune";
import SearchStationsForm from "@/components/fuel-prices/SearchStationsForm";
import FavoriteStationsList from "@/components/fuel-prices/FavoriteStationsList";
import Snackbar from "@/components/common/Snackbar";
import PageTransition from "@/components/common/PageTransition";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useSnackbar } from "@/lib/useSnackbar";
import { useDelayedLoading } from "@/lib/hooks/useDelayedLoading";
import { usePathAnimation } from "@/lib/hooks/usePathAnimation";
import {
  useFavoriteStations,
  useAddFavoriteStation,
  useRemoveFavoriteStation,
  useSearchStations,
} from "@/lib/hooks/useFuelPrices";
import { GasStationResponse, GasStationSearchRequest } from "@/lib/api";

type SortByType = "e5" | "e10" | "diesel";

export default function SearchStations() {
  const { t } = useTranslation();
  const router = useRouter();

  // Use smart path-based animations
  const {
    isVisible,
    animationDirection,
    navigateWithAnimation,
    navigateBackWithAnimation,
  } = usePathAnimation({ currentPath: "/fuel-prices/stations" });

  const [searchSortBy, setSearchSortBy] = useState<string>("e5");
  const [searchParams, setSearchParams] =
    useState<GasStationSearchRequest | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showingResults, setShowingResults] = useState(false);
  const { isLoading, startLoading, stopLoading } = useDelayedLoading();
  const { snackbar, showSuccess, showError, hideSnackbar } = useSnackbar();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isFormLoading = isLoading("search-submit");

  // React Query hooks for favorites
  const { data: favorites = [] } = useFavoriteStations();
  const addFavorite = useAddFavoriteStation();
  const removeFavorite = useRemoveFavoriteStation();

  // React Query hook for search results
  const { data: searchResults = [], isLoading: isLoadingResults } =
    useSearchStations(searchParams);

  const showForm = !showingResults;

  // Load search params from URL on mount
  useEffect(() => {
    if (!router.isReady) return;

    const { lat, lng, rad, fuelType, sortBy, openOnly } = router.query;

    if (lat && lng && rad) {
      // Restore search params from URL - this is a back navigation
      const params: GasStationSearchRequest = {
        lat: parseFloat(lat as string),
        lng: parseFloat(lng as string),
        rad: parseFloat(rad as string),
        fuel_type: (fuelType as string) || "all",
        sort_by: (sortBy as string) || "dist",
        open_only: openOnly === "true",
      };
      setSearchParams(params);
      const effectiveSortBy =
        params.sort_by === "dist" ? params.fuel_type : params.sort_by;
      setSearchSortBy(effectiveSortBy || "e5");
      setShowingResults(true);
    }
    setIsInitialized(true);
  }, [router.isReady, router.query]);

  const handleBack = () => {
    navigateWithAnimation("/fuel-prices");
  };

  const handleSearch = (
    results: GasStationResponse[],
    searchParams: {
      fuelType: string;
      sortBy: string;
      lat: number;
      lng: number;
      rad: number;
      openOnly: boolean;
    },
  ) => {
    const params: GasStationSearchRequest = {
      lat: searchParams.lat,
      lng: searchParams.lng,
      rad: searchParams.rad,
      fuel_type: searchParams.fuelType,
      sort_by: searchParams.sortBy,
      open_only: searchParams.openOnly,
    };

    // Start loading with threshold
    startLoading("search-submit");
    setIsSubmitting(true);

    setSearchParams(params);
    setShowingResults(true);
    setSearchSortBy(
      searchParams.sortBy === "dist"
        ? searchParams.fuelType
        : searchParams.sortBy,
    );

    // Update URL with search params to preserve state on navigation
    router.push(
      {
        pathname: "/fuel-prices/stations",
        query: {
          lat: searchParams.lat,
          lng: searchParams.lng,
          rad: searchParams.rad,
          fuelType: searchParams.fuelType,
          sortBy: searchParams.sortBy,
          openOnly: searchParams.openOnly,
        },
      },
      undefined,
      { shallow: true },
    );

    showSuccess(
      `${t.common.success}: ${results.length} ${t.fuelPrices.searchResults}`,
    );

    // Stop loading after minimum duration
    stopLoading("search-submit");
    setIsSubmitting(false);
  };

  const handleSearchError = (error: string) => {
    showError(error);
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
    navigateWithAnimation(
      `/fuel-prices/stations/${encodeURIComponent(stationId)}`,
    );
  };

  const favoriteIds = new Set(favorites.map((f) => f.station_id));

  return (
    <PageTransition
      isVisible={isVisible}
      animationDirection={animationDirection}
      className="max-w-7xl mx-auto px-4 py-4 md:py-8"
    >
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
            <h1 className="heading-1">{t.fuelPrices.searchStations}</h1>
            <p className="text-secondary mt-2 text-sm md:text-base">
              {t.fuelPrices.searchDescription}
            </p>
          </div>
          {!showForm && searchResults.length > 0 && (
            <button
              onClick={handleRefineSearch}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30 transition-colors"
            >
              <TuneIcon className="w-5 h-5" />
              <span className="hidden sm:inline">{t.fuelPrices.search}</span>
            </button>
          )}
          {showForm && searchParams !== null && searchResults.length > 0 && (
            <button
              onClick={handleBackToResults}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30 transition-colors"
            >
              <ArrowForwardIcon className="w-5 h-5" />
              <span className="hidden sm:inline">
                {t.fuelPrices.backToResults}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Form or Results */}
      {!isInitialized || isLoadingResults ? (
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
            fuelType: (router.query.fuelType as string) || undefined,
            sortBy: (router.query.sortBy as string) || undefined,
            openOnly: router.query.openOnly === "true",
          }}
        />
      ) : (
        <FavoriteStationsList
          favorites={searchResults}
          loading={false}
          sortBy={searchSortBy as SortByType}
          onAddToFavorites={handleAddToFavorites}
          onRemoveFromFavorites={handleRemoveFromFavorites}
          isLoading={isLoading}
          onNavigateToDetail={handleNavigateToDetail}
          favoriteIds={favoriteIds}
          showRank={true}
        />
      )}

      {/* Snackbar */}
      <Snackbar
        message={snackbar.message}
        type={snackbar.type}
        isVisible={snackbar.isVisible}
        onClose={hideSnackbar}
      />
    </PageTransition>
  );
}
