import { useTranslation } from "@/lib/i18n/LanguageContext";
import { FavoriteStationResponse } from "@/lib/api";
import EmptyState from "@/components/common/EmptyState";
import StationCard from "./StationCard";
import { LoadingSpinner } from "../common";

type SortByType = "e5" | "e10" | "diesel";

interface FavoriteStationsListProps {
  favorites: FavoriteStationResponse[];
  onRemove: (stationId: string) => void;
  loading: boolean;
  sortBy?: SortByType;
}

export default function FavoriteStationsList({
  favorites,
  onRemove,
  loading,
  sortBy = "e5",
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

  // Sort favorites based on sortBy preference
  const sortedFavorites = [...favorites].sort((a, b) => {
    const aIsOpen = a.is_open ?? true;
    const bIsOpen = b.is_open ?? true;

    // First priority: Always keep open stations before closed stations
    if (aIsOpen !== bIsOpen) {
      return aIsOpen ? -1 : 1;
    }

    // Second priority: If both have the same open/closed status, sort by fuel type price
    let priceA: number | undefined;
    let priceB: number | undefined;

    if (sortBy === "e5") {
      priceA = a.current_price_e5;
      priceB = b.current_price_e5;
    } else if (sortBy === "e10") {
      priceA = a.current_price_e10;
      priceB = b.current_price_e10;
    } else if (sortBy === "diesel") {
      priceA = a.current_price_diesel;
      priceB = b.current_price_diesel;
    }

    // Handle undefined prices (stations without that fuel type go to the end)
    if (priceA === undefined && priceB === undefined) return 0;
    if (priceA === undefined) return 1;
    if (priceB === undefined) return -1;

    // Sort by price (cheapest first)
    return priceA - priceB;
  });

  return (
    <div className="space-y-4">
      {sortedFavorites.map((station) => (
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
