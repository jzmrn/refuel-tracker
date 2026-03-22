import { Suspense } from "react";
import { useRouter } from "next/router";
import FavoriteStationsList from "@/components/fuel-prices/FavoriteStationsList";
import FuelTypeFilter from "@/components/fuel/FuelTypeFilter";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { FuelType } from "@/lib/api";
import { useFuelType } from "@/lib/fuelType";
import {
  useFavoriteStations,
  useRefreshFavorites,
} from "@/lib/hooks/useFuelPrices";
import { LoadingSpinner } from "@/components/common";

export default function FuelPrices() {
  const { t } = useTranslation();

  const router = useRouter();

  const refreshFavorites = useRefreshFavorites();

  const { fuelType: sortBy, setFuelType: setSortBy } = useFuelType();

  const handleSortChange = (newSortBy: FuelType) => {
    setSortBy(newSortBy);
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
        <h2 className="heading-2">{t.fuelPrices.myFavorites}</h2>
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
      <Suspense fallback={<LoadingSpinner />}>
        <FavoriteStationsList
          sortBy={sortBy}
          onNavigateToDetail={handleNavigateToDetail}
        />
      </Suspense>
    </div>
  );
}
