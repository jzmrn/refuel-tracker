import { Suspense } from "react";
import { useRouter } from "next/router";
import FavoriteStationsList from "@/components/fuel-prices/FavoriteStationsList";
import FuelTypeFilter from "@/components/fuel/FuelTypeFilter";
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
  ActionBar,
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
    router.push("/stations/search");
  };

  const handleNavigateToDetail = (stationId: string) => {
    router.push(`/stations/${encodeURIComponent(stationId)}`);
  };

  return (
    <PageContainer>
      <PageHeader
        title={t.fuelPrices.title}
        subtitle={t.fuelPrices.searchDescription}
      />

      {/* Action Bar with Refresh and Search Buttons */}
      <ActionBar
        title={t.fuelPrices.myFavorites}
        actions={
          <>
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
        shortLabels={false}
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
