import { useFavoriteStations } from "@/lib/hooks/useFuelPrices";
import { useTranslation, useLocalization } from "@/lib/i18n/LanguageContext";
import StationsList, { SortByType } from "./StationsList";
import { StackLayout } from "@/components/common";

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
  const { data: favoritesResponse } = useFavoriteStations();
  const { t } = useTranslation();
  const { formatTimestamp } = useLocalization();

  const { generated_at: generatedAt, stations: favorites } = favoritesResponse;

  // Find the latest updated_at across all stations
  const latestUpdatedAt = favorites.reduce<string | undefined>((latest, s) => {
    if (!s.updated_at) return latest;
    if (!latest) return s.updated_at;
    return s.updated_at > latest ? s.updated_at : latest;
  }, undefined);

  // Stations whose updated_at differs from the global latest
  const staleStations = latestUpdatedAt
    ? favorites.filter((s) => s.updated_at && s.updated_at !== latestUpdatedAt)
    : [];

  return (
    <StackLayout>
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
      <div className="text-xs text-secondary mb-3 space-y-0.5">
        <div className="mb-4">
          {t.fuelPrices.lastRefresh}: {formatTimestamp(generatedAt)}
          {latestUpdatedAt && (
            <>
              {" · "}
              {t.fuelPrices.pricesUpdatedAt}: {formatTimestamp(latestUpdatedAt)}
            </>
          )}
        </div>
        {staleStations.map((s) => (
          <div key={s.station_id}>
            {s.brand ?? t.fuelPrices.unknown} {s.place ?? ""} -{" "}
            {formatTimestamp(s.updated_at!)}
          </div>
        ))}
      </div>
    </StackLayout>
  );
}
