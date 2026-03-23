import { useRouter } from "next/router";
import { Suspense, useState } from "react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useFuelType } from "@/lib/fuelType";
import Snackbar from "@/components/common/Snackbar";
import { useSnackbar } from "@/lib/useSnackbar";
import {
  useFavoriteStations,
  useRemoveFavoriteStation,
  useStationMeta,
} from "@/lib/hooks/useFuelPrices";
import { FuelType } from "@/lib/api";
import FuelTypeFilter from "@/components/fuel/FuelTypeFilter";
import StationMetaInfo from "@/components/fuel/StationMetaInfo";
import StationPriceChart from "@/components/fuel/StationPriceChart";
import StationDailyStatsChart from "@/components/fuel/StationDailyStatsChart";
import StationPriceChangesChart from "@/components/fuel/StationPriceChangesChart";
import { LoadingSpinner } from "@/components/common";

function StationDetailsContent({ stationId }: { stationId: string }) {
  const router = useRouter();
  const { t } = useTranslation();

  const { fuelType: selectedFuelType, setFuelType: setSelectedFuelType } =
    useFuelType();

  const handleFuelTypeChange = (fuelType: FuelType) => {
    setSelectedFuelType(fuelType);
  };

  const [isRemoving, setIsRemoving] = useState(false);
  const { snackbar, showError, showSuccess, hideSnackbar } = useSnackbar();

  // Check if this station is in favorites
  const { data: favorites } = useFavoriteStations();
  const removeFavorite = useRemoveFavoriteStation();

  // Get station meta
  const { data: stationMeta } = useStationMeta(stationId);

  const isFavorite = favorites.some((f) => f.station_id === stationId);

  const handleBack = () => {
    router.back();
  };

  const handleRemoveFavorite = async () => {
    try {
      setIsRemoving(true);
      await removeFavorite.mutateAsync(stationId);
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

  const allFuelTypes: FuelType[] = ["e5", "e10", "diesel"];

  return (
    <>
      {/* Station Meta Info */}
      <StationMetaInfo
        stationId={stationId}
        isFavorite={isFavorite}
        isRemoving={isRemoving}
        onRemoveFavorite={handleRemoveFavorite}
        onCopyAddress={handleCopyAddress}
      />

      {/* Fuel Type Selector */}
      <FuelTypeFilter
        selectedFuelType={selectedFuelType}
        onFuelTypeChange={handleFuelTypeChange}
        availableFuelTypes={allFuelTypes}
        className="mb-6"
      />

      {/* Charts */}
      <StationPriceChart stationId={stationId} fuelType={selectedFuelType} />

      <div className="mt-6">
        <StationDailyStatsChart
          stationId={stationId}
          fuelType={selectedFuelType}
        />
      </div>

      <div className="mt-6">
        <StationPriceChangesChart
          stationId={stationId}
          fuelType={selectedFuelType}
        />
      </div>

      <Snackbar
        message={snackbar.message}
        type={snackbar.type}
        isVisible={snackbar.isVisible}
        onClose={hideSnackbar}
      />
    </>
  );
}

export default function StationDetails() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = router.query;
  const stationId = typeof id === "string" ? id : undefined;

  const handleBack = () => {
    router.back();
  };

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
        <Suspense fallback={<LoadingSpinner />}>
          {stationId ? (
            <StationDetailsContent stationId={stationId} />
          ) : (
            <LoadingSpinner />
          )}
        </Suspense>
      </div>
    </div>
  );
}
