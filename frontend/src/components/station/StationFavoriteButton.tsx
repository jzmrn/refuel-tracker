import {
  useAddFavoriteStation,
  useFavoriteStations,
  useRemoveFavoriteStation,
} from "@/lib/hooks/useFuelPrices";
import { FavoriteToggleButton } from "@/components/common";

interface StationFavoriteButtonProps {
  stationId: string;
}

export default function StationFavoriteButton({
  stationId,
}: StationFavoriteButtonProps) {
  const { data: favoritesResponse } = useFavoriteStations();
  const addFavorite = useAddFavoriteStation();
  const removeFavorite = useRemoveFavoriteStation();

  const isFavorite = favoritesResponse.stations.some(
    (f) => f.station_id === stationId,
  );

  return (
    <FavoriteToggleButton
      isFavorite={isFavorite}
      onAdd={() => addFavorite.mutateAsync(stationId)}
      onRemove={() => removeFavorite.mutateAsync(stationId)}
      isLoading={addFavorite.isPending || removeFavorite.isPending}
      size="md"
    />
  );
}
