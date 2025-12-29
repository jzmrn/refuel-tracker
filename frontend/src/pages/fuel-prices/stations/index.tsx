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

type SortByType = "e5" | "e10" | "diesel" | "dist";

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

    const { lat, lng, rad, sortBy } = router.query;

    if (lat && lng && rad) {
      // Update searchSortBy from URL
      setSearchSortBy((sortBy as string) || "dist");
      // searchParams and showingResults are already initialized from URL
    }
    setIsInitialized(true);
  }, [router.isReady, router.query]);

  // Switch to results view and stop loading once results are available (for new searches)
  useEffect(() => {
    if (searchParams && !isLoadingResults && !showingResults && isSubmitting) {
      // Data has loaded (could be empty or with results)
      if (searchResults.length > 0) {
        setShowingResults(true);
      }
      stopLoading("search-submit");
      setIsSubmitting(false);
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
      setIsSubmitting(false);
    }
  }, [
    searchParams,
    isLoadingResults,
    searchResults.length,
    showingResults,
    isSubmitting,
  ]);

  const handleBack = () => {
    navigateWithAnimation("/fuel-prices");
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
        pathname: "/fuel-prices/stations",
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
          {/* Fuel Type Sort Control */}
          <div className="panel p-4 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.fuelPrices.sortBy}:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={() => handleSortChange("dist")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    searchSortBy === "dist"
                      ? "bg-primary-50 text-primary-700 dark:bg-blue-900/20 dark:text-blue-300"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {t.fuelPrices.distance}
                </button>
                <button
                  onClick={() => handleSortChange("e5")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    searchSortBy === "e5"
                      ? "bg-primary-50 text-primary-700 dark:bg-blue-900/20 dark:text-blue-300"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {t.fuelPrices.e5}
                </button>
                <button
                  onClick={() => handleSortChange("e10")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    searchSortBy === "e10"
                      ? "bg-primary-50 text-primary-700 dark:bg-blue-900/20 dark:text-blue-300"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {t.fuelPrices.e10}
                </button>
                <button
                  onClick={() => handleSortChange("diesel")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    searchSortBy === "diesel"
                      ? "bg-primary-50 text-primary-700 dark:bg-blue-900/20 dark:text-blue-300"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {t.fuelPrices.diesel}
                </button>
              </div>
            </div>
          </div>
          <FavoriteStationsList
            favorites={searchResults}
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
      <Snackbar
        message={snackbar.message}
        type={snackbar.type}
        isVisible={snackbar.isVisible}
        onClose={hideSnackbar}
      />
    </PageTransition>
  );
}
