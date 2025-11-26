import { useTranslation } from "@/lib/i18n/LanguageContext";
import { GasStationResponse, FavoriteStationResponse } from "@/lib/api";

interface StationCardProps {
  station: GasStationResponse | FavoriteStationResponse;
  isFavorite: boolean;
  onAddToFavorites?: () => void;
  onRemoveFromFavorites?: () => void;
}

export default function StationCard({
  station,
  isFavorite,
  onAddToFavorites,
  onRemoveFromFavorites,
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

  // Get prices
  let priceE5: number | undefined;
  let priceE10: number | undefined;
  let priceDiesel: number | undefined;
  let distance: number | undefined;
  let displayPrice: number | undefined;

  if (isGasStation(station)) {
    priceE5 = station.e5;
    priceE10 = station.e10;
    priceDiesel = station.diesel;
    distance = station.dist;
    displayPrice = station.price || station.e5 || station.e10 || station.diesel;
  } else {
    priceE5 = station.current_price_e5;
    priceE10 = station.current_price_e10;
    priceDiesel = station.current_price_diesel;

    // Get best price for favorites
    const prices = [priceE5, priceE10, priceDiesel].filter(
      (p) => p !== undefined && p !== null,
    ) as number[];
    displayPrice = prices.length > 0 ? Math.min(...prices) : undefined;
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
        <sup className={supClassName}>{formatted.superscript}</sup>
      </>
    );
  };

  return (
    <div className="card hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between gap-4">
        {/* Left: Price */}
        <div className="flex-shrink-0 text-center">
          {displayPrice !== undefined && displayPrice !== null ? (
            <>
              <div className="text-2xl md:text-3xl font-bold text-primary">
                {renderPrice(displayPrice, "text-sm md:text-lg")}
              </div>
              <div className="text-xs text-secondary mt-1">€ / L</div>
            </>
          ) : (
            <div className="text-lg md:text-2xl text-secondary">-</div>
          )}
          {distance !== undefined && (
            <div className="text-xs text-secondary mt-2">
              {distance.toFixed(1)} {t.fuelPrices.kmAway}
            </div>
          )}
          {!isGasStation(station) && (
            <div className="mt-2">
              <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  isOpen
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {isOpen ? t.fuelPrices.open : t.fuelPrices.closed}
              </span>
            </div>
          )}
        </div>

        {/* Center: Station Info */}
        <div className="flex-grow min-w-0">
          <h4 className="heading-4 md:heading-3 truncate">
            {station.brand ?? station.name}
          </h4>
          <p className="text-sm text-secondary mt-1">
            {station.street} {station.house_number}, {station.post_code}{" "}
            {station.place}
          </p>

          {/* Price Details */}
          {isOpen && (
            <div className="mt-2 md:mt-3 flex md:grid md:grid-cols-3 gap-2 md:gap-2 text-xs flex-wrap">
              {priceE5 && (
                <div>
                  <span className="text-secondary md:block">
                    {t.fuelPrices.e5}
                    {isGasStation(station) && ": "}
                  </span>
                  <span className="font-semibold">
                    {renderPrice(priceE5)} €
                  </span>
                </div>
              )}
              {priceE10 && (
                <div>
                  <span className="text-secondary md:block">
                    {t.fuelPrices.e10}
                    {isGasStation(station) && ": "}
                  </span>
                  <span className="font-semibold">
                    {renderPrice(priceE10)} €
                  </span>
                </div>
              )}
              {priceDiesel && (
                <div>
                  <span className="text-secondary md:block">
                    {t.fuelPrices.diesel}
                    {isGasStation(station) && ": "}
                    {renderPrice(priceDiesel)} €
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Add/Remove Button */}
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
    </div>
  );
}
