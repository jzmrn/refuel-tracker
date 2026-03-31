import { useRouter } from "next/router";
import { Suspense, useState } from "react";
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
import {
  LoadingSpinner,
  PageContainer,
  PageHeader,
  StackLayout,
} from "@/components/common";

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
  const { data: favoritesResponse } = useFavoriteStations();
  const removeFavorite = useRemoveFavoriteStation();

  // Get station meta
  const { data: stationMeta } = useStationMeta(stationId);

  const isFavorite = favoritesResponse.stations.some(
    (f) => f.station_id === stationId,
  );

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
    <StackLayout>
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

      {snackbar.isVisible && (
        <Snackbar
          message={snackbar.message}
          type={snackbar.type}
          isVisible={true}
          onClose={hideSnackbar}
        />
      )}
    </StackLayout>
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
    <PageContainer>
      <PageHeader title={t.fuelPrices.stationDetails} onBack={handleBack} />

      <Suspense fallback={<LoadingSpinner />}>
        {stationId ? (
          <StationDetailsContent stationId={stationId} />
        ) : (
          <LoadingSpinner />
        )}
      </Suspense>
    </PageContainer>
  );
}
