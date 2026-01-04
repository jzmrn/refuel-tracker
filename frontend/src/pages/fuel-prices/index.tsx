import { useState, useEffect } from "react";
import FavoriteStationsList from "@/components/fuel-prices/FavoriteStationsList";
import Snackbar from "@/components/common/Snackbar";
import PageTransition from "@/components/common/PageTransition";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import { useSnackbar } from "@/lib/useSnackbar";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { usePathAnimation } from "@/lib/hooks/usePathAnimation";
import {
  useFavoriteStationsWithMinLoadTime,
  useRefreshFavorites,
} from "@/lib/hooks/useFuelPrices";

type SortByType = "e5" | "e10" | "diesel";

const SORT_BY_STORAGE_KEY = "fuelPrices.sortBy";

export default function FuelPrices() {
  const { t } = useTranslation();

  // Use smart path-based animations
  const { isVisible, animationDirection, navigateWithAnimation } =
    usePathAnimation({ currentPath: "/fuel-prices" });

  // React Query hooks - data persists across navigation
  const {
    data: favorites = [],
    isLoading: loading,
    error: favoritesError,
  } = useFavoriteStationsWithMinLoadTime();
  const refreshFavorites = useRefreshFavorites();

  // Initialize sortBy with value from localStorage or default to "e5"
  const [sortBy, setSortBy] = useState<SortByType>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(SORT_BY_STORAGE_KEY);
      if (stored === "e5" || stored === "e10" || stored === "diesel") {
        return stored;
      }
    }
    return "e5";
  });
  const { snackbar, showError, hideSnackbar } = useSnackbar();

  // Show error if favorites fetch fails
  useEffect(() => {
    if (favoritesError) {
      showError(t.fuelPrices.failedToLoadFavorites);
    }
  }, [favoritesError, showError, t.fuelPrices.failedToLoadFavorites]);

  const handleSortChange = (newSortBy: SortByType) => {
    setSortBy(newSortBy);
    localStorage.setItem(SORT_BY_STORAGE_KEY, newSortBy);
  };

  const handleSearchClick = () => {
    navigateWithAnimation("/fuel-prices/stations");
  };

  const handleNavigateToDetail = (stationId: string) => {
    navigateWithAnimation(
      `/fuel-prices/stations/${encodeURIComponent(stationId)}`,
    );
  };

  return (
    <PageTransition
      isVisible={isVisible}
      animationDirection={animationDirection}
      className="max-w-7xl mx-auto px-4 py-4 md:py-8"
    >
      {/* Header */}
      <div className="mb-6 md:mb-8 flex justify-between items-start">
        <div>
          <h1 className="heading-1">{t.fuelPrices.title}</h1>
          <p className="text-secondary mt-2 text-sm md:text-base">
            {t.fuelPrices.searchDescription}
          </p>
        </div>
      </div>

      {/* Action Bar with Refresh and Search Buttons */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="heading-2">
          {t.fuelPrices.myFavorites} ({favorites.length})
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => refreshFavorites()}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Refresh"
          >
            <RefreshIcon className="icon text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={handleSearchClick}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={t.fuelPrices.searchStations}
          >
            <SearchIcon className="icon text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Sort Control Panel */}
      <div className="panel p-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t.fuelPrices.sortBy}:
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleSortChange("e5")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                sortBy === "e5"
                  ? "bg-primary-50 text-primary-700 dark:bg-blue-900/20 dark:text-blue-300"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {t.fuelPrices.e5}
            </button>
            <button
              onClick={() => handleSortChange("e10")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                sortBy === "e10"
                  ? "bg-primary-50 text-primary-700 dark:bg-blue-900/20 dark:text-blue-300"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {t.fuelPrices.e10}
            </button>
            <button
              onClick={() => handleSortChange("diesel")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                sortBy === "diesel"
                  ? "bg-primary-50 text-primary-700 dark:bg-blue-900/20 dark:text-blue-300"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {t.fuelPrices.diesel}
            </button>
          </div>
        </div>
      </div>

      {/* Favorites List */}
      <FavoriteStationsList
        favorites={favorites}
        loading={loading}
        sortBy={sortBy}
        onNavigateToDetail={handleNavigateToDetail}
        showRank={true}
      />

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
