import { useRouter } from "next/router";
import { useState, useRef } from "react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import Snackbar from "@/components/common/Snackbar";
import { useSnackbar } from "@/lib/useSnackbar";
import {
  useFavoriteStations,
  useRemoveFavoriteStation,
  useStationMeta,
} from "@/lib/hooks/useFuelPrices";
import { FuelType } from "@/lib/api";
import FuelTypeSelector from "@/components/fuel/FuelTypeSelector";
import StationMetaInfo from "@/components/fuel/StationMetaInfo";
import StationPriceChart from "@/components/fuel/StationPriceChart";
import StationDailyStatsChart from "@/components/fuel/StationDailyStatsChart";
import StationPriceChangesChart from "@/components/fuel/StationPriceChangesChart";
import { LoadingSpinner } from "@/components/common";

const FUEL_TYPE_STORAGE_KEY = "stationDetails.fuelType";

export default function StationDetails() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = router.query;

  // Keep track of the last valid ID to prevent flashing during navigation
  const lastValidIdRef = useRef<string | undefined>(undefined);
  if (typeof id === "string") {
    lastValidIdRef.current = id;
  }
  const stableId = typeof id === "string" ? id : lastValidIdRef.current;

  // Fuel type selection - persist in localStorage
  const [selectedFuelType, setSelectedFuelType] = useState<FuelType>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(FUEL_TYPE_STORAGE_KEY);
      if (stored === "e5" || stored === "e10" || stored === "diesel") {
        return stored;
      }
    }
    return "e5";
  });

  const handleFuelTypeChange = (fuelType: FuelType) => {
    setSelectedFuelType(fuelType);
    localStorage.setItem(FUEL_TYPE_STORAGE_KEY, fuelType);
  };

  const [isRemoving, setIsRemoving] = useState(false);
  const { snackbar, showError, showSuccess, hideSnackbar } = useSnackbar();

  // Check if this station is in favorites
  const { data: favorites = [] } = useFavoriteStations();
  const removeFavorite = useRemoveFavoriteStation();

  // Get station meta to determine available fuel types
  const { data: stationMeta } = useStationMeta(stableId);

  const isFavorite =
    typeof stableId === "string" &&
    favorites.some((f) => f.station_id === stableId);

  const handleBack = () => {
    router.back();
  };

  const handleRemoveFavorite = async () => {
    if (!stableId) return;
    try {
      setIsRemoving(true);
      await removeFavorite.mutateAsync(stableId);
      // Navigate back after successful removal
      setTimeout(() => {
        handleBack();
      }, 500);
    } catch (error) {
      console.error("Error removing favorite:", error);
      showError(t.fuelPrices.failedToRemoveFavorite);
      setIsRemoving(false);
    }
  };

  const handleCopyAddress = () => {
    if (!stationMeta) return;
    const addressParts = [
      stationMeta.street,
      stationMeta.house_number,
      stationMeta.post_code,
      stationMeta.place,
    ]
      .filter(Boolean)
      .join(" ");
    navigator.clipboard.writeText(addressParts);
    showSuccess(t.fuelPrices.addressCopied);
  };

  // Always show all fuel types
  const allFuelTypes: FuelType[] = ["e5", "e10", "diesel"];

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 md:py-8">
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
        {!router.isReady ? (
          <LoadingSpinner />
        ) : stableId ? (
          <>
            {/* Station Meta Info */}
            <StationMetaInfo
              stationId={stableId}
              isFavorite={isFavorite}
              isRemoving={isRemoving}
              onRemoveFavorite={handleRemoveFavorite}
              onCopyAddress={handleCopyAddress}
            />

            {/* Fuel Type Selector */}
            <div className="panel mb-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <h2 className="heading-2">{t.common.statistics}</h2>
                <FuelTypeSelector
                  selectedFuelType={selectedFuelType}
                  onFuelTypeChange={handleFuelTypeChange}
                  availableFuelTypes={allFuelTypes}
                />
              </div>
            </div>

            {/* Price Chart */}
            <StationPriceChart
              stationId={stableId}
              fuelType={selectedFuelType}
            />

            {/* Daily Stats Chart */}
            <div className="mt-6">
              <StationDailyStatsChart
                stationId={stableId}
                fuelType={selectedFuelType}
              />
            </div>

            {/* Price Changes Chart */}
            <div className="mt-6">
              <StationPriceChangesChart
                stationId={stableId}
                fuelType={selectedFuelType}
              />
            </div>
          </>
        ) : (
          <div className="panel text-center">
            <div className="text-sm uppercase tracking-wide text-secondary mb-2">
              {t.fuelPrices.stationId}
            </div>
            <div className="heading-1">{t.fuelPrices.unknown}</div>
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
    </div>
  );
}
