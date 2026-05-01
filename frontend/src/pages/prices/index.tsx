import { Suspense } from "react";
import { useRouter } from "next/router";
import FavoriteStationsList from "@/components/fuel-prices/FavoriteStationsList";
import FuelTypeFilter from "@/components/fuel/FuelTypeFilter";
import BarChartIcon from "@mui/icons-material/BarChart";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { FuelType } from "@/lib/api";
import { useFuelType } from "@/lib/fuelType";
import { useRefreshFavorites } from "@/lib/hooks/useFuelPrices";
import {
  LoadingSpinner,
  PageContainer,
  PageHeader,
  IconButton,
} from "@/components/common";

export default function FuelPrices() {
  const { t } = useTranslation();

  const router = useRouter();

  const refreshFavorites = useRefreshFavorites();

  const { fuelType: sortBy, setFuelType: setSortBy } = useFuelType();

  const handleSortChange = (newSortBy: FuelType) => {
    setSortBy(newSortBy);
  };

  const handleSearchClick = () => {
    router.push("/prices/stations/search");
  };

  const handleStatsClick = () => {
    router.push("/prices/stats");
  };

  const handleNavigateToDetail = (stationId: string) => {
    router.push(`/prices/stations/${encodeURIComponent(stationId)}`);
  };

  return (
    <PageContainer>
      <PageHeader
        title={t.fuelPrices.title}
        actions={
          <>
            <IconButton
              onClick={handleStatsClick}
              icon={
                <BarChartIcon className="icon text-gray-600 dark:text-gray-400" />
              }
              ariaLabel={t.navigation.statistics}
            />
            <IconButton
              onClick={() => refreshFavorites()}
              icon={
                <RefreshIcon className="icon text-gray-600 dark:text-gray-400" />
              }
              ariaLabel="Refresh"
            />
            <IconButton
              onClick={handleSearchClick}
              icon={
                <SearchIcon className="icon text-gray-600 dark:text-gray-400" />
              }
              ariaLabel={t.fuelPrices.searchStations}
            />
          </>
        }
      />

      {/* Sort Control Panel */}
      <FuelTypeFilter
        selectedFuelType={sortBy}
        onFuelTypeChange={handleSortChange}
        className="mb-6"
      />

      {/* Favorites List */}
      <Suspense fallback={<LoadingSpinner />}>
        <FavoriteStationsList
          sortBy={sortBy}
          onNavigateToDetail={handleNavigateToDetail}
        />
      </Suspense>
    </PageContainer>
  );
}
