import { useTranslation } from "@/lib/i18n/LanguageContext";
import { GasStationResponse, FavoriteStationResponse } from "@/lib/api";
import { useRouter } from "next/router";
import CircularProgress from "@mui/material/CircularProgress";

interface StationCardProps {
  station: GasStationResponse | FavoriteStationResponse;
  isFavorite: boolean;
  onAddToFavorites?: () => void;
  onRemoveFromFavorites?: () => void;
  sortBy: "e5" | "e10" | "diesel";
  rankIndex?: number;
  isLoading?: boolean;
}

export default function StationCard({
  station,
  isFavorite,
  onAddToFavorites,
  onRemoveFromFavorites,
  rankIndex,
  sortBy,
  isLoading = false,
}: StationCardProps) {
  const { t } = useTranslation();
  const router = useRouter();

  const handleCardClick = () => {
    const stationId = isGasStation(station) ? station.id : station.station_id;
    router.push(`/fuel-prices/station/${encodeURIComponent(stationId)}`);
  };

  // Type guard to check if this is a GasStationResponse
  const isGasStation = (
    s: GasStationResponse | FavoriteStationResponse,
  ): s is GasStationResponse => {
    return "id" in s;
  };

  // Extract common data from both types
  const houseNumber = isGasStation(station)
    ? station.house_number
    : station.house_number;
  const postCode = station.post_code;
  const place = station.place;
  const isOpen = station.is_open ?? false;

  // Extract timestamp for favorite stations
  const timestamp = !isGasStation(station) ? station.timestamp : undefined;

  // Format timestamp to show only time
  const formatTime = (timestamp?: string) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    return date.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get prices
  let priceE5: number | undefined;
  let priceE10: number | undefined;
  let priceDiesel: number | undefined;
  let distance: number | undefined;

  if (isGasStation(station)) {
    priceE5 = station.e5;
    priceE10 = station.e10;
    priceDiesel = station.diesel;
    distance = station.dist;
  } else {
    priceE5 = station.current_price_e5;
    priceE10 = station.current_price_e10;
    priceDiesel = station.current_price_diesel;
  }

  const formatPrice = (price?: number) => {
    if (price === undefined || price === null) return null;
    const priceStr = price.toFixed(3);
    const mainPart = priceStr.slice(0, -1); // e.g., "1.56"
    const superscript = priceStr.slice(-1); // e.g., "9"
    return { mainPart, superscript };
  };

  const renderPrice = (
    price?: number,
    supClassName: string = "text-[0.6em]",
  ) => {
    const formatted = formatPrice(price);
    if (!formatted) return null;
    return (
      <>
        {formatted.mainPart}
        <sup className={`${supClassName} align-baseline`}>
          {formatted.superscript}
        </sup>
      </>
    );
  };

  const renderPriceColumn = (
    price: number | undefined,
    fuelType: "e5" | "e10" | "diesel",
    label: string,
  ) => {
    if (price === undefined || price === null || typeof price !== "number") {
      return null;
    }

    const isActive = sortBy === fuelType;

    return (
      <div className="text-center w-20">
        <div className="text-3xl font-bold text-primary">
          {renderPrice(price, "text-lg")}
        </div>
        <div className="text-xs mt-1">
          {isActive ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-500 text-white">
              {label}
            </span>
          ) : (
            <span className="text-secondary">{label}</span>
          )}
        </div>
      </div>
    );
  };

  const renderMobilePrice = (
    price: number | undefined,
    fuelType: "e5" | "e10" | "diesel",
    label: string,
  ) => {
    if (sortBy !== fuelType) {
      return null;
    }

    return (
      <div className="text-center">
        <div className="text-2xl font-bold text-primary">
          {price === undefined || price === null || typeof price !== "number"
            ? "-"
            : renderPrice(price, "text-base")}
        </div>
        <div className="text-[0.6rem] text-secondary">{label}</div>
      </div>
    );
  };

  return (
    <div
      className="card hover:shadow-lg transition-shadow cursor-pointer"
      onClick={handleCardClick}
    >
      {/* Desktop Layout */}
      <div className="hidden lg:flex items-center justify-between gap-4">
        {/* Left: Station Info */}
        <div className="flex-grow min-w-0">
          <div className="flex items-center gap-2">
            {/* Rank Badge for Open Favorite Stations */}
            {!isGasStation(station) && isOpen && rankIndex !== undefined && (
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold flex-shrink-0 bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                #{rankIndex}
              </span>
            )}
            <h4 className="heading-3 truncate">
              {station.brand ?? station.name}
            </h4>
            {timestamp && (
              <span className="text-xs text-secondary flex-shrink-0">
                ({formatTime(timestamp)})
              </span>
            )}
            {distance !== undefined && (
              <span className="text-xs text-secondary flex-shrink-0">
                ({distance.toFixed(1)} {t.fuelPrices.kmAway})
              </span>
            )}
          </div>
          <p className="text-sm text-secondary mt-1 truncate">
            {station.street}
            {station.house_number && ` ${station.house_number}`},{" "}
            {station.post_code} {station.place}
          </p>
        </div>

        {/* Right: Prices */}
        <div className="flex-shrink-0">
          <div className="flex gap-6">
            {renderPriceColumn(priceE5, "e5", t.fuelPrices.e5)}
            {renderPriceColumn(priceE10, "e10", t.fuelPrices.e10)}
            {renderPriceColumn(priceDiesel, "diesel", t.fuelPrices.diesel)}
          </div>
        </div>

        {/* Far Right: Favorite Button */}
        {(onAddToFavorites || onRemoveFromFavorites) && (
          <div className="flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isLoading) return;
                if (isFavorite && onRemoveFromFavorites) {
                  onRemoveFromFavorites();
                } else if (!isFavorite && onAddToFavorites) {
                  onAddToFavorites();
                }
              }}
              className={isFavorite ? "btn-sm-secondary" : "btn-sm-primary"}
              title={
                isFavorite
                  ? t.fuelPrices.removeFromFavorites
                  : t.fuelPrices.addToFavorites
              }
              disabled={isLoading}
            >
              {isLoading ? (
                <CircularProgress size={20} sx={{ color: "white" }} />
              ) : isFavorite ? (
                "★"
              ) : (
                "☆"
              )}
            </button>
          </div>
        )}
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Selected Price - only show if a specific fuel type is selected */}
          {(sortBy === "e5" || sortBy === "e10" || sortBy === "diesel") && (
            <div className="flex-shrink-0 w-16">
              {renderMobilePrice(priceE5, "e5", t.fuelPrices.e5)}
              {renderMobilePrice(priceE10, "e10", t.fuelPrices.e10)}
              {renderMobilePrice(priceDiesel, "diesel", t.fuelPrices.diesel)}
            </div>
          )}

          {/* Station Info */}
          <div className="flex-grow min-w-0">
            <div className="flex items-center gap-2">
              {/* Rank Badge for Open Favorite Stations */}
              {!isGasStation(station) && isOpen && rankIndex !== undefined && (
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold flex-shrink-0 bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                  #{rankIndex}
                </span>
              )}
              <h4 className="heading-4 truncate">
                {station.brand ?? station.name}
              </h4>
              {timestamp && (
                <span className="text-xs text-secondary flex-shrink-0">
                  ({formatTime(timestamp)})
                </span>
              )}
              {distance !== undefined && (
                <span className="text-xs text-secondary flex-shrink-0">
                  ({distance.toFixed(1)} {t.fuelPrices.kmAway})
                </span>
              )}
            </div>
            <div className="text-sm text-secondary mt-1 flex flex-col xs:flex-row xs:gap-x-1">
              <span className="truncate">
                {station.street}
                {station.house_number && ` ${station.house_number}`},
              </span>
              <span className="truncate">
                {station.post_code} {station.place}
              </span>
            </div>
          </div>

          {/* Favorite Button */}
          {(onAddToFavorites || onRemoveFromFavorites) && (
            <div className="flex-shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (isLoading) return;
                  if (isFavorite && onRemoveFromFavorites) {
                    onRemoveFromFavorites();
                  } else if (!isFavorite && onAddToFavorites) {
                    onAddToFavorites();
                  }
                }}
                className={isFavorite ? "btn-sm-secondary" : "btn-sm-primary"}
                title={
                  isFavorite
                    ? t.fuelPrices.removeFromFavorites
                    : t.fuelPrices.addToFavorites
                }
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="inline-block animate-spin">⟳</span>
                ) : isFavorite ? (
                  "★"
                ) : (
                  "☆"
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
