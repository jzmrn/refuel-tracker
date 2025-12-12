import { useState, useEffect } from "react";
import SearchStationsForm from "@/components/fuel-prices/SearchStationsForm";
import FavoriteStationsList from "@/components/fuel-prices/FavoriteStationsList";
import PriceStatistics from "@/components/fuel-prices/PriceStatistics";
import StationCard from "@/components/fuel-prices/StationCard";
import Snackbar from "@/components/common/Snackbar";
import FloatingActionButton from "@/components/common/FloatingActionButton";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useSnackbar } from "@/lib/useSnackbar";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import apiService, {
  GasStationResponse,
  FavoriteStationResponse,
} from "@/lib/api";

type TabType = "favorites" | "statistics" | "search";
type SortByType = "e5" | "e10" | "diesel";

const SORT_BY_STORAGE_KEY = "fuelPrices.sortBy";

export default function FuelPrices() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>("favorites");
  const [searchResults, setSearchResults] = useState<GasStationResponse[]>([]);
  const [favorites, setFavorites] = useState<FavoriteStationResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isMobileFormOpen, setIsMobileFormOpen] = useState(false);
  const [isMobileResultsOpen, setIsMobileResultsOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortByType | null>(null);
  const { snackbar, showSuccess, showError, hideSnackbar } = useSnackbar();

  // Load sort preference from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(SORT_BY_STORAGE_KEY);
    if (stored === "e5" || stored === "e10" || stored === "diesel") {
      setSortBy(stored);
    } else {
      setSortBy("e5");
    }
  }, []);

  const handleSortChange = (newSortBy: SortByType) => {
    setSortBy(newSortBy);
    localStorage.setItem(SORT_BY_STORAGE_KEY, newSortBy);
  };

  useEffect(() => {
    fetchFavorites();
  }, [refreshTrigger]);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      const data = await apiService.getFavoriteStations();
      setFavorites(data);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      showError(t.fuelPrices.failedToLoadFavorites);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (results: GasStationResponse[]) => {
    setSearchResults(results);
    showSuccess(
      `${t.common.success}: ${results.length} ${t.fuelPrices.searchResults}`,
    );
    // On mobile, close the form and open the results popup
    setIsMobileFormOpen(false);
    setIsMobileResultsOpen(true);
  };

  const handleSearchError = (error: string) => {
    showError(error);
  };

  const handleAddToFavorites = async (stationId: string) => {
    try {
      await apiService.addFavoriteStation(stationId);
      setRefreshTrigger((prev) => prev + 1);
      showSuccess(t.fuelPrices.stationAdded);
      setIsMobileFormOpen(false);
    } catch (error) {
      console.error("Error adding favorite:", error);
      showError(t.fuelPrices.failedToAddFavorite);
    }
  };

  const handleRemoveFromFavorites = async (stationId: string) => {
    try {
      await apiService.deleteFavoriteStation(stationId);
      setRefreshTrigger((prev) => prev + 1);
      showSuccess(t.fuelPrices.stationRemoved);
    } catch (error) {
      console.error("Error removing favorite:", error);
      showError(t.fuelPrices.failedToRemoveFavorite);
    }
  };

  const renderSearchResults = () => {
    if (searchResults.length === 0) {
      return (
        <div className="panel p-8 text-center">
          <p className="text-secondary">
            {t.fuelPrices.searchForStationsNearby}
          </p>
        </div>
      );
    }

    const favoriteIds = new Set(favorites.map((f) => f.station_id));

    return (
      <div className="space-y-4 mt-6">
        <h3 className="heading-3">
          {t.fuelPrices.searchResults} ({searchResults.length})
        </h3>
        {searchResults.map((station) => {
          const isFavorite = favoriteIds.has(station.id);

          return (
            <StationCard
              key={station.id}
              station={station}
              isFavorite={isFavorite}
              onAddToFavorites={() => handleAddToFavorites(station.id)}
              onRemoveFromFavorites={() =>
                handleRemoveFromFavorites(station.id)
              }
            />
          );
        })}
      </div>
    );
  };

  const tabs = [
    { id: "favorites" as TabType, label: t.fuelPrices.favorites, icon: "⭐" },
    { id: "statistics" as TabType, label: t.fuelPrices.statistics, icon: "📊" },
    { id: "search" as TabType, label: t.fuelPrices.searchStations, icon: "🔍" },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "search":
        return (
          <div>
            <SearchStationsForm
              onSearch={handleSearch}
              onError={handleSearchError}
            />
            <div className="mt-6">{renderSearchResults()}</div>
          </div>
        );
      case "favorites":
        return (
          <div>
            {/* Heading with Refresh Button */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="heading-2">
                {t.fuelPrices.myFavorites} ({favorites.length})
              </h2>
              <button
                onClick={() => setRefreshTrigger((prev) => prev + 1)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <RefreshIcon className="icon text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Sort Control Panel */}
            {sortBy && (
              <div className="panel p-4 mb-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t.fuelPrices.sortBy}:
                  </label>
                  <div className="flex gap-2">
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
            )}

            <FavoriteStationsList
              favorites={favorites}
              onRemove={handleRemoveFromFavorites}
              loading={loading}
              sortBy={sortBy || "e5"}
            />
          </div>
        );
      case "statistics":
        return <PriceStatistics loading={loading} />;
      default:
        return null;
    }
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

      {/* Desktop Tab Navigation - Hidden on mobile and md, shown from lg onwards */}
      <div className="tab-container">
        <div className="tab-border">
          <nav className="tab-nav" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tab-button ${
                  activeTab === tab.id
                    ? "tab-button-active"
                    : "tab-button-inactive"
                }`}
              >
                <span className="tab-icon">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Desktop Tab Content - Only shown from lg onwards */}
      <div className="min-h-[400px] hidden lg:block">{renderTabContent()}</div>

      {/* Mobile/Tablet Unified View - Visible on mobile and md, hidden from lg onwards */}
      <div className="lg:hidden space-y-6">
        {/* Favorites List */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="heading-2">{t.fuelPrices.myFavorites}</h2>
            <button
              onClick={() => setRefreshTrigger((prev) => prev + 1)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <RefreshIcon className="icon text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Sort Control Panel */}
          {sortBy && (
            <div className="panel p-4 mb-4">
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t.fuelPrices.sortBy}:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleSortChange("e5")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      sortBy === "e5"
                        ? "bg-primary-50 text-primary-700 dark:bg-blue-900/20 dark:text-blue-300"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {t.fuelPrices.e5}
                  </button>
                  <button
                    onClick={() => handleSortChange("e10")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      sortBy === "e10"
                        ? "bg-primary-50 text-primary-700 dark:bg-blue-900/20 dark:text-blue-300"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {t.fuelPrices.e10}
                  </button>
                  <button
                    onClick={() => handleSortChange("diesel")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      sortBy === "diesel"
                        ? "bg-primary-50 text-primary-700 dark:bg-blue-900/20 dark:text-blue-300"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {t.fuelPrices.diesel}
                  </button>
                </div>
              </div>
            </div>
          )}

          <FavoriteStationsList
            favorites={favorites}
            onRemove={handleRemoveFromFavorites}
            loading={loading}
            sortBy={sortBy || "e5"}
          />
        </div>

        {/* Statistics */}
        <div>
          <h2 className="heading-2 mb-4">{t.fuelPrices.statistics}</h2>
          <PriceStatistics loading={loading} />
        </div>
      </div>

      {/* Floating Action Button for Mobile - Search Form */}
      <FloatingActionButton
        onAddClick={() => setIsMobileFormOpen(true)}
        isOpen={isMobileFormOpen}
        onClose={() => setIsMobileFormOpen(false)}
      >
        <SearchStationsForm
          onSearch={handleSearch}
          onError={handleSearchError}
        />
      </FloatingActionButton>

      {/* Mobile Results Popup - Without FAB button */}
      {isMobileResultsOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black bg-opacity-25"
            onClick={() => setIsMobileResultsOpen(false)}
          />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-h-[85vh] flex flex-col">
              <div className="relative p-4 border-b border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setIsMobileResultsOpen(false)}
                  className="absolute top-4 right-4 rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg
                    className="w-5 h-5 text-gray-500 dark:text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
                <h3 className="heading-3">
                  {t.fuelPrices.searchResults} ({searchResults.length})
                </h3>
              </div>
              <div className="overflow-y-auto flex-1 p-4">
                {searchResults.length === 0 ? (
                  <p className="text-secondary text-center py-8">
                    {t.fuelPrices.searchForStationsNearby}
                  </p>
                ) : (
                  <div className="space-y-4">
                    {searchResults.map((station) => {
                      const isFavorite = favorites
                        .map((f) => f.station_id)
                        .includes(station.id);

                      return (
                        <StationCard
                          key={station.id}
                          station={station}
                          isFavorite={isFavorite}
                          onAddToFavorites={() =>
                            handleAddToFavorites(station.id)
                          }
                          onRemoveFromFavorites={() =>
                            handleRemoveFromFavorites(station.id)
                          }
                        />
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setIsMobileResultsOpen(false)}
                  className="w-full btn-primary py-3 rounded-lg font-medium"
                >
                  {t.common.close}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Snackbar */}
      <Snackbar
        message={snackbar.message}
        type={snackbar.type}
        isVisible={snackbar.isVisible}
        onClose={hideSnackbar}
      />
    </div>
  );
}
