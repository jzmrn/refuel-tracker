import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CircularProgress from "@mui/material/CircularProgress";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { apiService, StationDetailsResponse } from "@/lib/api";
import Snackbar from "@/components/common/Snackbar";
import PageTransition from "@/components/common/PageTransition";
import { useSnackbar } from "@/lib/useSnackbar";
import { usePathAnimation } from "@/lib/hooks/usePathAnimation";
import {
  useFavoriteStations,
  useRemoveFavoriteStation,
} from "@/lib/hooks/useFuelPrices";
import FuelPriceChart from "@/components/fuel/FuelPriceChart";

export default function StationDetails() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = router.query;

  // Use smart path-based animations
  const { isVisible, animationDirection, navigateBackWithAnimation } =
    usePathAnimation({
      currentPath: `/fuel-prices/stations/${id || ""}`,
    });

  const [stationData, setStationData] = useState<StationDetailsResponse | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRemoving, setIsRemoving] = useState(false);
  const { snackbar, showError, showSuccess, hideSnackbar } = useSnackbar();

  // Check if this station is in favorites
  const { data: favorites = [] } = useFavoriteStations();
  const removeFavorite = useRemoveFavoriteStation();

  const isFavorite =
    typeof id === "string" && favorites.some((f) => f.station_id === id);

  useEffect(() => {
    // Fetch station details from API
    const fetchStationDetails = async () => {
      if (!id || typeof id !== "string") return;

      try {
        setIsLoading(true);
        const data = await apiService.getStationDetails(id);
        setStationData(data);
      } catch (error) {
        console.error("Failed to fetch station details:", error);
        showError(t.fuelPrices.failedToLoadFavorites);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStationDetails();
  }, [id, showError, t.fuelPrices.failedToLoadFavorites]);

  const handleBack = () => {
    navigateBackWithAnimation();
  };

  const formatPrice = (price?: number) => {
    if (price === undefined || price === null) return "-";
    const priceStr = price.toFixed(3);
    const mainPart = priceStr.slice(0, -1);
    const superscript = priceStr.slice(-1);
    return (
      <>
        {mainPart}
        <sup className="text-[0.6em] align-baseline">{superscript}</sup>
      </>
    );
  };

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    return date.toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <PageTransition
      isVisible={isVisible}
      animationDirection={animationDirection}
      className="max-w-7xl mx-auto px-4 py-4 md:py-8"
    >
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={handleBack}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={t.common.back}
          >
            <ArrowBackIcon className="icon text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex-1">
            <h1 className="heading-1">{t.fuelPrices.stationDetails}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        {isLoading ? (
          <div className="panel text-center">
            <div className="flex flex-col items-center gap-2">
              <CircularProgress size={20} />
              <span className="text-secondary">{t.common.loading}</span>
            </div>
          </div>
        ) : stationData ? (
          <>
            {/* Station Header */}
            <div className="panel mb-6">
              <div className="text-center mb-4">
                <h2 className="heading-1">
                  {stationData.brand ||
                    stationData.name ||
                    t.fuelPrices.unknown}
                </h2>
                {stationData.brand &&
                  stationData.name &&
                  stationData.brand !== stationData.name && (
                    <p className="text-sm text-secondary mt-1">
                      {stationData.name}
                    </p>
                  )}
              </div>

              {/* Status Badge */}
              {stationData.is_open !== undefined && (
                <div className="flex justify-center">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      stationData.is_open
                        ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                        : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
                    }`}
                  >
                    {stationData.is_open
                      ? t.fuelPrices.open
                      : t.fuelPrices.closed}
                  </span>
                </div>
              )}
            </div>

            {/* Current Prices */}
            {(stationData.current_price_e5 ||
              stationData.current_price_e10 ||
              stationData.current_price_diesel) && (
              <div className="panel mb-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-3 gap-1">
                  <h3 className="heading-3">{t.fuelPrices.currentPrices}</h3>
                  {stationData.timestamp && (
                    <span className="text-xs text-secondary">
                      {t.fuelPrices.lastUpdated}:{" "}
                      {formatTime(stationData.timestamp)}
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:justify-center gap-2">
                  {stationData.current_price_e5 !== undefined &&
                    stationData.current_price_e5 !== null && (
                      <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800 sm:w-[140px]">
                        <div className="text-sm text-secondary mb-2">
                          {t.fuelPrices.e5}
                        </div>
                        <div className="text-3xl font-bold text-primary">
                          {formatPrice(stationData.current_price_e5)}
                        </div>
                      </div>
                    )}

                  {stationData.current_price_e10 !== undefined &&
                    stationData.current_price_e10 !== null && (
                      <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800 sm:w-[140px]">
                        <div className="text-sm text-secondary mb-2">
                          {t.fuelPrices.e10}
                        </div>
                        <div className="text-3xl font-bold text-primary">
                          {formatPrice(stationData.current_price_e10)}
                        </div>
                      </div>
                    )}

                  {stationData.current_price_diesel !== undefined &&
                    stationData.current_price_diesel !== null && (
                      <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800 sm:w-[140px]">
                        <div className="text-sm text-secondary mb-2">
                          {t.fuelPrices.diesel}
                        </div>
                        <div className="text-3xl font-bold text-primary">
                          {formatPrice(stationData.current_price_diesel)}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            )}

            {/* Price History Charts */}
            {stationData.price_history_24h &&
              stationData.price_history_24h.length > 0 && (
                <>
                  {/* E5 Chart */}
                  {stationData.current_price_e5 !== undefined &&
                    stationData.current_price_e5 !== null && (
                      <div className="panel mb-6">
                        <h3 className="heading-3 mb-4">
                          {t.fuelPrices.e5} - {t.fuelPrices.priceHistory24h}
                        </h3>
                        <FuelPriceChart
                          data={stationData.price_history_24h}
                          fuelType="e5"
                          color="#ef4444"
                          label={t.fuelPrices.e5}
                        />
                      </div>
                    )}

                  {/* E10 Chart */}
                  {stationData.current_price_e10 !== undefined &&
                    stationData.current_price_e10 !== null && (
                      <div className="panel mb-6">
                        <h3 className="heading-3 mb-4">
                          {t.fuelPrices.e10} - {t.fuelPrices.priceHistory24h}
                        </h3>
                        <FuelPriceChart
                          data={stationData.price_history_24h}
                          fuelType="e10"
                          color="#f59e0b"
                          label={t.fuelPrices.e10}
                        />
                      </div>
                    )}

                  {/* Diesel Chart */}
                  {stationData.current_price_diesel !== undefined &&
                    stationData.current_price_diesel !== null && (
                      <div className="panel mb-6">
                        <h3 className="heading-3 mb-4">
                          {t.fuelPrices.diesel} - {t.fuelPrices.priceHistory24h}
                        </h3>
                        <FuelPriceChart
                          data={stationData.price_history_24h}
                          fuelType="diesel"
                          color="#3b82f6"
                          label={t.fuelPrices.diesel}
                        />
                      </div>
                    )}
                </>
              )}

            {/* Address */}
            {(stationData.street || stationData.place) && (
              <div className="panel mb-6 text-center">
                <h3 className="heading-3 mb-3">{t.fuelPrices.address}</h3>
                <div className="text-base">
                  {stationData.street && (
                    <div>
                      {stationData.street}
                      {stationData.house_number &&
                        ` ${stationData.house_number}`}
                    </div>
                  )}
                  {(stationData.post_code || stationData.place) && (
                    <div>
                      {stationData.post_code && `${stationData.post_code} `}
                      {stationData.place}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions Panel */}
            {(stationData.street ||
              stationData.place ||
              isFavorite ||
              isRemoving) && (
              <div className="panel">
                <h3 className="heading-3 mb-4">{t.common.actions}</h3>
                <div className="flex flex-col gap-3">
                  {(stationData.street || stationData.place) && (
                    <button
                      onClick={() => {
                        const addressParts = [
                          stationData.street,
                          stationData.house_number,
                          stationData.post_code,
                          stationData.place,
                        ]
                          .filter(Boolean)
                          .join(" ");
                        navigator.clipboard.writeText(addressParts);
                        showSuccess(t.fuelPrices.addressCopied);
                      }}
                      className="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white py-3 rounded-lg transition-colors font-medium text-sm"
                    >
                      {t.fuelPrices.copyAddress}
                    </button>
                  )}
                  {(isFavorite || isRemoving) && (
                    <button
                      onClick={async () => {
                        try {
                          setIsRemoving(true);
                          await removeFavorite.mutateAsync(id as string);
                          // Navigate back after successful removal
                          setTimeout(() => {
                            handleBack();
                          }, 500);
                        } catch (error) {
                          console.error("Error removing favorite:", error);
                          showError(t.fuelPrices.failedToRemoveFavorite);
                          setIsRemoving(false);
                        }
                      }}
                      disabled={isRemoving}
                      className="w-full btn-danger py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isRemoving ? (
                        <>
                          <CircularProgress size={20} sx={{ color: "white" }} />
                          <span>{t.common.loading}</span>
                        </>
                      ) : (
                        t.fuelPrices.removeFromFavorites
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="panel text-center">
            <div className="text-sm uppercase tracking-wide text-secondary mb-2">
              {t.fuelPrices.stationId}
            </div>
            <div className="heading-1">{id || t.fuelPrices.unknown}</div>
            <div className="text-sm text-secondary mt-2">
              {t.fuelPrices.noDataAvailable}
            </div>
          </div>
        )}
      </div>

      {/* Snackbar */}
      <Snackbar
        message={snackbar.message}
        type={snackbar.type}
        isVisible={snackbar.isVisible}
        onClose={hideSnackbar}
      />
    </PageTransition>
  );
}
