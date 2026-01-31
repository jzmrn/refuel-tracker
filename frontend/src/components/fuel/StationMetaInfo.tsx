import { useQuery } from "@tanstack/react-query";
import CircularProgress from "@mui/material/CircularProgress";
import CloseIcon from "@mui/icons-material/Close";
import LinkIcon from "@mui/icons-material/Link";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import apiService, { StationMetaResponse } from "@/lib/api";
import { fuelPricesKeys } from "@/lib/hooks/useFuelPrices";
import Panel from "@/components/common/Panel";
import { formatFuelPrice } from "@/lib/formatPrice";

interface StationMetaInfoProps {
  stationId: string;
  isFavorite: boolean;
  isRemoving: boolean;
  onRemoveFavorite: () => void;
  onCopyAddress: () => void;
}

export default function StationMetaInfo({
  stationId,
  isFavorite,
  isRemoving,
  onRemoveFavorite,
  onCopyAddress,
}: StationMetaInfoProps) {
  const { t } = useTranslation();

  const { data: stationData, isLoading } = useQuery({
    queryKey: fuelPricesKeys.stationMeta(stationId),
    queryFn: () => apiService.getStationMeta(stationId),
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });

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

  const getFormattedAddress = () => {
    if (!stationData) return null;
    const parts: string[] = [];
    if (stationData.street) {
      parts.push(
        stationData.street +
          (stationData.house_number ? ` ${stationData.house_number}` : ""),
      );
    }
    if (stationData.post_code || stationData.place) {
      parts.push(
        (stationData.post_code ? `${stationData.post_code} ` : "") +
          (stationData.place || ""),
      );
    }
    return parts.length > 0 ? parts.join(", ") : null;
  };

  const renderStatusBadge = () => (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
        stationData?.is_open === null || stationData?.is_open === undefined
          ? "bg-gray-100 text-gray-800 dark:bg-gray-700/20 dark:text-gray-300"
          : stationData?.is_open
          ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
          : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
      }`}
    >
      {stationData?.is_open === null || stationData?.is_open === undefined
        ? t.fuelPrices.statusNotAvailable
        : stationData?.is_open
        ? t.fuelPrices.open
        : t.fuelPrices.closed}
    </span>
  );

  const renderHeaderActions = () => {
    if (!isFavorite && !isRemoving) return null;
    return (
      <button
        onClick={onRemoveFavorite}
        disabled={isRemoving}
        className="p-2 text-white hover:text-gray-200 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title={t.fuelPrices.removeFromFavorites}
      >
        {isRemoving ? (
          <CircularProgress size={18} sx={{ color: "currentColor" }} />
        ) : (
          <CloseIcon fontSize="small" />
        )}
      </button>
    );
  };

  const renderTitle = () => (
    <div className="flex items-center gap-3">
      <span className="text-xl font-semibold">
        {stationData?.brand || stationData?.name || t.fuelPrices.unknown}
      </span>
      {renderStatusBadge()}
    </div>
  );

  if (isLoading) {
    return (
      <div className="mb-6">
        <Panel>
          <div className="text-center py-4">
            <div className="flex flex-col items-center gap-2">
              <CircularProgress size={20} />
              <span className="text-secondary">{t.common.loading}</span>
            </div>
          </div>
        </Panel>
      </div>
    );
  }

  if (!stationData) {
    return (
      <div className="mb-6">
        <Panel>
          <div className="text-center">
            <div className="text-sm uppercase tracking-wide text-secondary mb-2">
              {t.fuelPrices.stationId}
            </div>
            <div className="heading-1">{stationId || t.fuelPrices.unknown}</div>
            <div className="text-sm text-secondary mt-2">
              {t.fuelPrices.noDataAvailable}
            </div>
          </div>
        </Panel>
      </div>
    );
  }

  const formattedAddress = getFormattedAddress();

  return (
    <>
      {/* Station Header with Address and Actions */}
      <Panel title={renderTitle()} actions={renderHeaderActions()}>
        {formattedAddress && (
          <button
            onClick={onCopyAddress}
            className="flex items-center gap-2 text-secondary hover:text-primary transition-colors text-sm group"
          >
            <LinkIcon className="w-4 h-4 text-secondary group-hover:text-primary" />
            <span>{formattedAddress}</span>
          </button>
        )}
      </Panel>

      {/* Current Prices */}
      <div className="mt-6 mb-6">
        <Panel
          title={t.fuelPrices.currentPrices}
          subtitle={
            stationData.timestamp && (
              <span className="text-xs text-secondary">
                {t.fuelPrices.lastUpdated}: {formatTime(stationData.timestamp)}
              </span>
            )
          }
        >
          <div className="flex flex-col xxs:flex-row justify-center items-center gap-1.5 sm:gap-2">
            <div className="text-center p-2 sm:p-3 rounded-lg bg-gray-50 dark:bg-gray-800 xs:flex-1 max-w-[140px] w-full xs:w-auto">
              <div className="text-2xl sm:text-3xl font-bold text-primary">
                {formatFuelPrice(stationData.current_price_e5, {
                  superscriptClass: "text-lg sm:text-xl",
                })}
              </div>
              <div className="text-xs sm:text-sm text-secondary mt-1.5 sm:mt-2">
                {t.fuelPrices.e5}
              </div>
            </div>

            <div className="text-center p-2 sm:p-3 rounded-lg bg-gray-50 dark:bg-gray-800 xs:flex-1 max-w-[140px] w-full xs:w-auto">
              <div className="text-2xl sm:text-3xl font-bold text-primary">
                {formatFuelPrice(stationData.current_price_e10, {
                  superscriptClass: "text-lg sm:text-xl",
                })}
              </div>
              <div className="text-xs sm:text-sm text-secondary mt-1.5 sm:mt-2">
                {t.fuelPrices.e10}
              </div>
            </div>

            <div className="text-center p-2 sm:p-3 rounded-lg bg-gray-50 dark:bg-gray-800 xs:flex-1 max-w-[140px] w-full xs:w-auto">
              <div className="text-2xl sm:text-3xl font-bold text-primary">
                {formatFuelPrice(stationData.current_price_diesel, {
                  superscriptClass: "text-lg sm:text-xl",
                })}
              </div>
              <div className="text-xs sm:text-sm text-secondary mt-1.5 sm:mt-2">
                {t.fuelPrices.diesel}
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}

// Export the station data type for use in parent components
export type { StationMetaResponse };
