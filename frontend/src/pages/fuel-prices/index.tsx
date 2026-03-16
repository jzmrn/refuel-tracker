import { useState } from "react";
import { useRouter } from "next/router";
import FavoriteStationsList from "@/components/fuel-prices/FavoriteStationsList";
import FuelTypeFilter from "@/components/fuel/FuelTypeFilter";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { FuelType } from "@/lib/api";
import {
  useFavoriteStationsWithMinLoadTime,
  useRefreshFavorites,
} from "@/lib/hooks/useFuelPrices";

const SORT_BY_STORAGE_KEY = "fuelPrices.sortBy";

export default function FuelPrices() {
  const { t } = useTranslation();
  const router = useRouter();

  // React Query hooks - data persists across navigation
  const {
    data: favorites = [],
    isLoading,
    isError,
  } = useFavoriteStationsWithMinLoadTime();
  const refreshFavorites = useRefreshFavorites();

  // Initialize sortBy with value from localStorage or default to "e5"
  const [sortBy, setSortBy] = useState<FuelType>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(SORT_BY_STORAGE_KEY);
      if (stored === "e5" || stored === "e10" || stored === "diesel") {
        return stored;
      }
    }
    return "e5";
  });

  const handleSortChange = (newSortBy: FuelType) => {
    setSortBy(newSortBy);
    localStorage.setItem(SORT_BY_STORAGE_KEY, newSortBy);
  };

  const handleSearchClick = () => {
    router.push("/fuel-prices/stations");
  };

  const handleNavigateToDetail = (stationId: string) => {
    router.push(`/fuel-prices/stations/${encodeURIComponent(stationId)}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 md:py-8">
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
      <FuelTypeFilter
        selectedFuelType={sortBy}
        onFuelTypeChange={handleSortChange}
        className="mb-6"
        shortLabels={false}
      />

      {/* Favorites List */}
      <FavoriteStationsList
        favorites={favorites}
        loading={isLoading}
        sortBy={sortBy}
        onNavigateToDetail={handleNavigateToDetail}
        showRank={true}
        isError={isError}
      />
    </div>
  );
}
