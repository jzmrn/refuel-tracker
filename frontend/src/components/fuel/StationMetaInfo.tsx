import CircularProgress from "@mui/material/CircularProgress";
import CloseIcon from "@mui/icons-material/Close";
import LinkIcon from "@mui/icons-material/Link";
import { useTranslation, useLocalization } from "@/lib/i18n/LanguageContext";
import { StationMetaResponse } from "@/lib/api";
import { useStationMeta } from "@/lib/hooks/useFuelPrices";
import Panel from "@/components/common/Panel";
import { renderSvgFuelPrice } from "@/lib/formatPrice";

function PriceCard({
  label,
  value,
  timestamp,
}: {
  label: string;
  value?: number | null;
  timestamp?: string;
}) {
  const { formatDate } = useLocalization();

  const formatTimeShort = (timestamp: string) =>
    formatDate(new Date(timestamp), {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="text-center p-2 sm:p-3 rounded-lg bg-gray-50 dark:bg-gray-800 xs:flex-1 max-w-[140px] w-full xs:w-auto">
      <div className="text-xs sm:text-sm text-secondary mb-1">{label}</div>
      <div className="text-2xl sm:text-3xl font-bold text-primary">
        {renderSvgFuelPrice(value, { showCurrency: false })}
        <span className="text-sm font-medium text-secondary ml-1">€</span>
      </div>
      {timestamp && (
        <div className="text-xs text-secondary mt-1">
          {formatTimeShort(timestamp)}
        </div>
      )}
    </div>
  );
}

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
  const { formatDate } = useLocalization();

  const { data: stationData } = useStationMeta(stationId);

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    return formatDate(date, {
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
        className="btn-icon-danger disabled:opacity-50 disabled:cursor-not-allowed"
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
            stationData.generated_at && (
              <span className="text-xs text-secondary">
                {t.fuelPrices.lastUpdated}:{" "}
                {formatTime(stationData.generated_at)}
              </span>
            )
          }
        >
          <div className="flex flex-col xxs:flex-row justify-center items-center gap-1.5 sm:gap-2">
            <PriceCard
              label={t.fuelPrices.e5}
              value={stationData.prices.e5.value}
              timestamp={stationData.prices.e5.timestamp}
            />
            <PriceCard
              label={t.fuelPrices.e10}
              value={stationData.prices.e10.value}
              timestamp={stationData.prices.e10.timestamp}
            />
            <PriceCard
              label={t.fuelPrices.diesel}
              value={stationData.prices.diesel.value}
              timestamp={stationData.prices.diesel.timestamp}
            />
          </div>
        </Panel>
      </div>
    </>
  );
}

// Export the station data type for use in parent components
export type { StationMetaResponse };
