import { useTranslation } from "@/lib/i18n/LanguageContext";
import { GasStationResponse, FavoriteStationResponse } from "@/lib/api";

interface StationCardProps {
  station: GasStationResponse | FavoriteStationResponse;
  isFavorite: boolean;
  onAddToFavorites?: () => void;
  onRemoveFromFavorites?: () => void;
  rankIndex?: number;
}

export default function StationCard({
  station,
  isFavorite,
  onAddToFavorites,
  onRemoveFromFavorites,
  rankIndex,
}: StationCardProps) {
  const { t } = useTranslation();

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

  return (
    <div className="card hover:shadow-lg transition-shadow">
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
            {station.street} {station.house_number}, {station.post_code}{" "}
            {station.place}
          </p>
        </div>

        {/* Right: Prices */}
        <div className="flex-shrink-0">
          <div className="flex gap-6">
            {priceE5 !== undefined &&
              priceE5 !== null &&
              typeof priceE5 === "number" && (
                <div className="text-center w-24">
                  <div className="text-3xl font-bold text-primary">
                    {renderPrice(priceE5, "text-lg")}
                  </div>
                  <div className="text-xs text-secondary mt-1">
                    {t.fuelPrices.e5}
                  </div>
                </div>
              )}
            {priceE10 !== undefined &&
              priceE10 !== null &&
              typeof priceE10 === "number" && (
                <div className="text-center w-24">
                  <div className="text-3xl font-bold text-primary">
                    {renderPrice(priceE10, "text-lg")}
                  </div>
                  <div className="text-xs text-secondary mt-1">
                    {t.fuelPrices.e10}
                  </div>
                </div>
              )}
            {priceDiesel !== undefined &&
              priceDiesel !== null &&
              typeof priceDiesel === "number" && (
                <div className="text-center w-24">
                  <div className="text-3xl font-bold text-primary">
                    {renderPrice(priceDiesel, "text-lg")}
                  </div>
                  <div className="text-xs text-secondary mt-1">
                    {t.fuelPrices.diesel}
                  </div>
                </div>
              )}
          </div>
        </div>

        {/* Far Right: Add/Remove Button */}
        <div className="flex-shrink-0">
          {isFavorite
            ? onRemoveFromFavorites && (
                <button
                  onClick={onRemoveFromFavorites}
                  className={
                    isGasStation(station) ? "btn-sm-secondary" : "btn-sm-danger"
                  }
                  title={t.fuelPrices.removeFromFavorites}
                >
                  {isGasStation(station) ? "⭐" : "✕"}
                </button>
              )
            : onAddToFavorites && (
                <button
                  onClick={onAddToFavorites}
                  className="btn-sm-primary"
                  title={t.fuelPrices.addToFavorites}
                >
                  ☆
                </button>
              )}
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between gap-4">
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
            <p className="text-sm text-secondary mt-1 truncate">
              {station.street} {station.house_number}, {station.post_code}{" "}
              {station.place}
            </p>

            {/* Prices Below Address - Mobile */}
            <div className="flex gap-4 mt-3 justify-center">
              {priceE5 !== undefined &&
                priceE5 !== null &&
                typeof priceE5 === "number" && (
                  <div className="text-center">
                    <div className="text-xs text-secondary">
                      {t.fuelPrices.e5}
                    </div>
                    <div className="text-lg font-bold text-primary">
                      {renderPrice(priceE5, "text-sm")}
                    </div>
                  </div>
                )}
              {priceE10 !== undefined &&
                priceE10 !== null &&
                typeof priceE10 === "number" && (
                  <div className="text-center">
                    <div className="text-xs text-secondary">
                      {t.fuelPrices.e10}
                    </div>
                    <div className="text-lg font-bold text-primary">
                      {renderPrice(priceE10, "text-sm")}
                    </div>
                  </div>
                )}
              {priceDiesel !== undefined &&
                priceDiesel !== null &&
                typeof priceDiesel === "number" && (
                  <div className="text-center">
                    <div className="text-xs text-secondary">
                      {t.fuelPrices.diesel}
                    </div>
                    <div className="text-lg font-bold text-primary">
                      {renderPrice(priceDiesel, "text-sm")}
                    </div>
                  </div>
                )}
            </div>
          </div>

          {/* Add/Remove Button */}
          <div className="flex-shrink-0">
            {isFavorite
              ? onRemoveFromFavorites && (
                  <button
                    onClick={onRemoveFromFavorites}
                    className={
                      isGasStation(station)
                        ? "btn-sm-secondary"
                        : "btn-sm-danger"
                    }
                    title={t.fuelPrices.removeFromFavorites}
                  >
                    {isGasStation(station) ? "⭐" : "✕"}
                  </button>
                )
              : onAddToFavorites && (
                  <button
                    onClick={onAddToFavorites}
                    className="btn-sm-primary"
                    title={t.fuelPrices.addToFavorites}
                  >
                    ☆
                  </button>
                )}
          </div>
        </div>
      </div>
    </div>
  );
}
