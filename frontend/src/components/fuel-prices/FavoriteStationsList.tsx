import { useFavoriteStations } from "@/lib/hooks/useFuelPrices";
import StationsList, { SortByType } from "./StationsList";

interface FavoriteStationsListProps {
  isError?: boolean;
  sortBy?: SortByType;
  onNavigateToDetail?: (stationId: string) => void;
  onAddToFavorites?: (stationId: string) => void;
  onRemoveFromFavorites?: (stationId: string) => void;
  isLoading?: (stationId: string) => boolean;
  favoriteIds?: Set<string>;
}

export default function FavoriteStationsList({
  sortBy = "dist",
  onNavigateToDetail,
  onAddToFavorites,
  onRemoveFromFavorites,
  isLoading,
  isError,
  favoriteIds = new Set(),
}: FavoriteStationsListProps) {
  const { data: favorites } = useFavoriteStations();

  return (
    <StationsList
      stations={favorites}
      loading={false}
      isError={isError}
      sortBy={sortBy}
      onNavigateToDetail={onNavigateToDetail}
      onAddToFavorites={onAddToFavorites}
      onRemoveFromFavorites={onRemoveFromFavorites}
      isLoading={isLoading}
      favoriteIds={favoriteIds}
      showRank={true}
    />
  );
}
