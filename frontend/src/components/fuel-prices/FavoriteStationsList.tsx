import { useTranslation } from "@/lib/i18n/LanguageContext";
import { FavoriteStationResponse, GasStationResponse } from "@/lib/api";
import EmptyState from "@/components/common/EmptyState";
import StationCard from "./StationCard";
import { LoadingSpinner } from "../common";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";

type SortByType = "e5" | "e10" | "diesel";
type StationType = FavoriteStationResponse | GasStationResponse;

interface FavoriteStationsListProps {
  favorites: StationType[];
  loading: boolean;
  sortBy?: SortByType;
  onNavigateToDetail?: (stationId: string) => void;
  onAddToFavorites?: (stationId: string) => void;
  onRemoveFromFavorites?: (stationId: string) => void;
  isLoading?: (stationId: string) => boolean;
  favoriteIds?: Set<string>;
  showRank?: boolean;
}

export default function FavoriteStationsList({
  favorites,
  loading,
  sortBy = "e5",
  onNavigateToDetail,
  onAddToFavorites,
  onRemoveFromFavorites,
  isLoading,
  favoriteIds = new Set(),
  showRank = false,
}: FavoriteStationsListProps) {
  const { t } = useTranslation();

  // Type guard to check if this is a GasStationResponse
  const isGasStation = (s: StationType): s is GasStationResponse => {
    return "id" in s;
  };

  // Helper to get station ID
  const getStationId = (station: StationType): string => {
    return isGasStation(station) ? station.id : station.station_id;
  };

  // Helper to check if station is favorite
  const isFavorite = (station: StationType): boolean => {
    return favoriteIds.has(getStationId(station));
  };

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
  const openStations: StationType[] = [];
  const closedStations: StationType[] = [];
  const unavailableStations: StationType[] = [];

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

  // Helper function to sort stations by price
  const sortStationsByPrice = (stations: StationType[]) => {
    return stations.sort((a, b) => {
      let priceA: number | undefined;
      let priceB: number | undefined;

      if (sortBy === "e5") {
        priceA = isGasStation(a) ? a.e5 : a.current_price_e5;
        priceB = isGasStation(b) ? b.e5 : b.current_price_e5;
      } else if (sortBy === "e10") {
        priceA = isGasStation(a) ? a.e10 : a.current_price_e10;
        priceB = isGasStation(b) ? b.e10 : b.current_price_e10;
      } else if (sortBy === "diesel") {
        priceA = isGasStation(a) ? a.diesel : a.current_price_diesel;
        priceB = isGasStation(b) ? b.diesel : b.current_price_diesel;
      }

      // Handle undefined prices (stations without that fuel type go to the end)
      if (priceA === undefined && priceB === undefined) return 0;
      if (priceA === undefined) return 1;
      if (priceB === undefined) return -1;

      // Sort by price (cheapest first)
      return priceA - priceB;
    });
  };

  // Sort open and closed stations by price
  const sortedOpenStations = sortStationsByPrice(openStations);
  const sortedClosedStations = sortStationsByPrice(closedStations);

  return (
    <div className="space-y-6">
      {/* Open Stations */}
      {sortedOpenStations.length > 0 && (
        <div className="space-y-4">
          <h3 className="heading-3 flex items-center gap-2">
            <CheckCircleIcon className="icon text-green-600 dark:text-green-400" />
            {t.fuelPrices.open} ({sortedOpenStations.length})
          </h3>
          {sortedOpenStations.map((station, index) => {
            const stationId = getStationId(station);
            return (
              <StationCard
                key={stationId}
                station={station}
                isFavorite={isFavorite(station)}
                rankIndex={showRank ? index + 1 : undefined}
                sortBy={sortBy}
                onNavigateToDetail={onNavigateToDetail}
                onAddToFavorites={
                  onAddToFavorites
                    ? () => onAddToFavorites(stationId)
                    : undefined
                }
                onRemoveFromFavorites={
                  onRemoveFromFavorites
                    ? () => onRemoveFromFavorites(stationId)
                    : undefined
                }
                isLoading={isLoading ? isLoading(stationId) : false}
              />
            );
          })}
        </div>
      )}

      {/* Closed Stations */}
      {sortedClosedStations.length > 0 && (
        <div className="space-y-4">
          <h3 className="heading-3 flex items-center gap-2">
            <CancelIcon className="icon text-red-600 dark:text-red-400" />
            {t.fuelPrices.closed} ({sortedClosedStations.length})
          </h3>
          {sortedClosedStations.map((station, index) => {
            const stationId = getStationId(station);
            return (
              <StationCard
                key={stationId}
                station={station}
                isFavorite={isFavorite(station)}
                sortBy={sortBy}
                onNavigateToDetail={onNavigateToDetail}
                onAddToFavorites={
                  onAddToFavorites
                    ? () => onAddToFavorites(stationId)
                    : undefined
                }
                onRemoveFromFavorites={
                  onRemoveFromFavorites
                    ? () => onRemoveFromFavorites(stationId)
                    : undefined
                }
                isLoading={isLoading ? isLoading(stationId) : false}
              />
            );
          })}
        </div>
      )}

      {/* Unavailable Stations */}
      {unavailableStations.length > 0 && (
        <div className="space-y-4">
          <h3 className="heading-3 flex items-center gap-2">
            <HelpOutlineIcon className="icon text-gray-600 dark:text-gray-400" />
            {t.fuelPrices.statusNotAvailable} ({unavailableStations.length})
          </h3>
          {unavailableStations.map((station) => {
            const stationId = getStationId(station);
            return (
              <StationCard
                key={stationId}
                station={station}
                isFavorite={isFavorite(station)}
                sortBy={sortBy}
                onNavigateToDetail={onNavigateToDetail}
                onAddToFavorites={
                  onAddToFavorites
                    ? () => onAddToFavorites(stationId)
                    : undefined
                }
                onRemoveFromFavorites={
                  onRemoveFromFavorites
                    ? () => onRemoveFromFavorites(stationId)
                    : undefined
                }
                isLoading={isLoading ? isLoading(stationId) : false}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
