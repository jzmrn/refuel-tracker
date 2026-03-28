import { useLocalization, useTranslation } from "@/lib/i18n/LanguageContext";
import { GasStationResponse, FavoriteStation } from "@/lib/api";
import CircularProgress from "@mui/material/CircularProgress";
import { renderSvgFuelPrice } from "@/lib/formatPrice";

interface StationCardProps {
  station: GasStationResponse | FavoriteStation;
  isFavorite: boolean;
  onAddToFavorites?: () => void;
  onRemoveFromFavorites?: () => void;
  sortBy: "e5" | "e10" | "diesel" | "dist";
  rankIndex?: number;
  isLoading?: boolean;
  onNavigateToDetail?: (stationId: string) => void;
}

export default function StationCard({
  station,
  isFavorite,
  onAddToFavorites,
  onRemoveFromFavorites,
  rankIndex,
  sortBy,
  isLoading = false,
  onNavigateToDetail,
}: StationCardProps) {
  const { t } = useTranslation();
  const { formatTimestamp } = useLocalization();

  const handleCardClick = () => {
    const stationId = isGasStation(station) ? station.id : station.station_id;
    if (onNavigateToDetail) {
      onNavigateToDetail(stationId);
    }
  };

  // Type guard to check if this is a GasStationResponse
  const isGasStation = (
    s: GasStationResponse | FavoriteStation,
  ): s is GasStationResponse => {
    return "id" in s;
  };

  const isOpen = station.is_open ?? false;

  // Extract price-since timestamp for the selected fuel type (favorite stations only)
  const getPriceSinceTimestamp = (): string | undefined => {
    if (isGasStation(station)) return undefined;
    if (sortBy === "e5") return station.prices.e5.timestamp;
    if (sortBy === "e10") return station.prices.e10.timestamp;
    if (sortBy === "diesel") return station.prices.diesel.timestamp;
    return undefined;
  };

  const priceSince = getPriceSinceTimestamp();

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
    priceE5 = station.prices.e5.value;
    priceE10 = station.prices.e10.value;
    priceDiesel = station.prices.diesel.value;
  }

  const renderPriceColumn = (
    price: number | undefined,
    fuelType: "e5" | "e10" | "diesel",
    label: string,
  ) => {
    const isActive = sortBy === fuelType;

    return (
      <div className="text-center w-20">
        <div className="text-3xl font-bold text-primary">
          {renderSvgFuelPrice(price, { showCurrency: false })}
        </div>
        <div className="text-xs mt-1">
          <span
            className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium min-h-[20px] ${
              isActive ? "bg-primary-500 text-white" : "text-secondary"
            }`}
          >
            {label}
          </span>
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
          {renderSvgFuelPrice(price, { showCurrency: false })}
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
            {/* Rank Badge for Open Stations */}
            {isOpen && rankIndex !== undefined && (
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold flex-shrink-0 bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                #{rankIndex}
              </span>
            )}
            <h4 className="heading-3 truncate">
              {station.brand ?? station.name}
            </h4>
            {priceSince && (
              <span className="text-xs text-secondary flex-shrink-0">
                ({formatTimestamp(priceSince)})
              </span>
            )}
            {distance !== undefined && (
              <span
                className={`text-xs flex-shrink-0 inline-flex items-center justify-center px-2 py-0.5 rounded-full font-medium min-h-[20px] ${
                  sortBy === "dist"
                    ? "bg-primary-500 text-white"
                    : "text-secondary"
                }`}
              >
                {distance.toFixed(1)} {t.fuelPrices.kmAway}
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
        {isOpen && (
          <div className="flex-shrink-0">
            <div className="flex gap-6">
              {renderPriceColumn(priceE5, "e5", t.fuelPrices.e5)}
              {renderPriceColumn(priceE10, "e10", t.fuelPrices.e10)}
              {renderPriceColumn(priceDiesel, "diesel", t.fuelPrices.diesel)}
            </div>
          </div>
        )}

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
          {isOpen &&
            (sortBy === "e5" || sortBy === "e10" || sortBy === "diesel") && (
              <div className="flex-shrink-0 w-16">
                {renderMobilePrice(priceE5, "e5", t.fuelPrices.e5)}
                {renderMobilePrice(priceE10, "e10", t.fuelPrices.e10)}
                {renderMobilePrice(priceDiesel, "diesel", t.fuelPrices.diesel)}
              </div>
            )}

          {/* Station Info */}
          <div className="flex-grow min-w-0">
            <div className="flex items-center gap-2">
              {/* Rank Badge for Open Stations */}
              {isOpen && rankIndex !== undefined && (
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold flex-shrink-0 bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                  #{rankIndex}
                </span>
              )}
              <h4 className="heading-4 truncate min-w-0">
                {station.brand ?? station.name}
              </h4>
              {distance !== undefined && (
                <span
                  className={`text-xs flex-shrink-0 inline-flex items-center justify-center px-2 py-0.5 rounded-full font-medium min-h-[20px] ${
                    sortBy === "dist"
                      ? "bg-primary-500 text-white"
                      : "text-secondary"
                  }`}
                >
                  {distance.toFixed(1)} {t.fuelPrices.kmAway}
                </span>
              )}
              {priceSince && (
                <span className="text-xs text-secondary flex-shrink-0 ml-auto">
                  {formatTimestamp(priceSince)}
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
