import { useTranslation } from "@/lib/i18n/LanguageContext";
import { FavoriteStationResponse } from "@/lib/api";
import EmptyState from "@/components/common/EmptyState";
import StationCard from "./StationCard";
import { LoadingSpinner } from "../common";

interface FavoriteStationsListProps {
  favorites: FavoriteStationResponse[];
  onRemove: (stationId: string) => void;
  loading: boolean;
}

export default function FavoriteStationsList({
  favorites,
  onRemove,
  loading,
}: FavoriteStationsListProps) {
  const { t } = useTranslation();

  if (loading) {
    return <LoadingSpinner text={t.common.loading} />;
  }

  if (favorites.length === 0) {
    return (
      <EmptyState
        icon="⭐"
        title={t.fuelPrices.noFavorites}
        subtitle={t.fuelPrices.addStationsToFavorites}
      />
    );
  }

  return (
    <div className="space-y-4">
      {favorites.map((station) => (
        <StationCard
          key={station.station_id}
          station={station}
          isFavorite={true}
          onRemoveFromFavorites={() => onRemove(station.station_id)}
        />
      ))}
    </div>
  );
}
