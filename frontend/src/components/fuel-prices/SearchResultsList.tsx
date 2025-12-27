import { useTranslation } from "@/lib/i18n/LanguageContext";
import { GasStationResponse } from "@/lib/api";
import StationCard from "./StationCard";

type SortByType = "e5" | "e10" | "diesel";

interface SearchResultsListProps {
  searchResults: GasStationResponse[];
  favoriteIds: Set<string>;
  sortBy: SortByType;
  onAddToFavorites: (stationId: string) => void;
  onRemoveFromFavorites: (stationId: string) => void;
  isLoading: (stationId: string) => boolean;
  onNavigateToDetail?: (stationId: string) => void;
}

export default function SearchResultsList({
  searchResults,
  favoriteIds,
  sortBy,
  onAddToFavorites,
  onRemoveFromFavorites,
  isLoading,
  onNavigateToDetail,
}: SearchResultsListProps) {
  const { t } = useTranslation();

  if (searchResults.length === 0) {
    return (
      <div className="panel p-8 text-center">
        <p className="text-secondary">{t.fuelPrices.searchForStationsNearby}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
            onAddToFavorites={() => onAddToFavorites(station.id)}
            onRemoveFromFavorites={() => onRemoveFromFavorites(station.id)}
            sortBy={sortBy}
            isLoading={isLoading(station.id)}
            onNavigateToDetail={onNavigateToDetail}
          />
        );
      })}
    </div>
  );
}
