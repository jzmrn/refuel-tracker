import { useTranslation } from "@/lib/i18n/LanguageContext";
import { FavoriteStationResponse } from "@/lib/api";
import EmptyState from "@/components/common/EmptyState";
import StationCard from "./StationCard";
import { LoadingSpinner } from "../common";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";

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

  // Split stations into open, closed, and unavailable
  const openStations: FavoriteStationResponse[] = [];
  const closedStations: FavoriteStationResponse[] = [];
  const unavailableStations: FavoriteStationResponse[] = [];

  favorites.forEach((station) => {
    const isOpen = station.is_open;

    // If is_open is null or undefined, consider it as unavailable
    if (isOpen === null || isOpen === undefined) {
      unavailableStations.push(station);
    } else if (isOpen) {
      openStations.push(station);
    } else {
      closedStations.push(station);
    }
  });

  // Sort open stations by price
  const sortedOpenStations = openStations.sort((a, b) => {
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
    <div className="space-y-6">
      {/* Open Stations */}
      {sortedOpenStations.length > 0 && (
        <div className="space-y-4">
          <h3 className="heading-3 flex items-center gap-2">
            <CheckCircleIcon className="icon text-green-600 dark:text-green-400" />
            {t.fuelPrices.open} ({sortedOpenStations.length})
          </h3>
          {sortedOpenStations.map((station, index) => (
            <StationCard
              key={station.station_id}
              station={station}
              isFavorite={true}
              onRemoveFromFavorites={() => onRemove(station.station_id)}
              rankIndex={index + 1}
              sortBy={sortBy}
            />
          ))}
        </div>
      )}

      {/* Closed Stations */}
      {closedStations.length > 0 && (
        <div className="space-y-4">
          <h3 className="heading-3 flex items-center gap-2">
            <CancelIcon className="icon text-red-600 dark:text-red-400" />
            {t.fuelPrices.closed} ({closedStations.length})
          </h3>
          {closedStations.map((station) => (
            <StationCard
              key={station.station_id}
              station={station}
              isFavorite={true}
              onRemoveFromFavorites={() => onRemove(station.station_id)}
              sortBy={sortBy}
            />
          ))}
        </div>
      )}

      {/* Unavailable Stations */}
      {unavailableStations.length > 0 && (
        <div className="space-y-4">
          <h3 className="heading-3 flex items-center gap-2">
            <HelpOutlineIcon className="icon text-gray-600 dark:text-gray-400" />
            {t.fuelPrices.statusNotAvailable} ({unavailableStations.length})
          </h3>
          {unavailableStations.map((station) => (
            <StationCard
              key={station.station_id}
              station={station}
              isFavorite={true}
              onRemoveFromFavorites={() => onRemove(station.station_id)}
              sortBy={sortBy}
            />
          ))}
        </div>
      )}
    </div>
  );
}
