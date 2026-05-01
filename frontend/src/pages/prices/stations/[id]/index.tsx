import { useRouter } from "next/router";
import { Suspense } from "react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useFuelType } from "@/lib/fuelType";
import Snackbar from "@/components/common/Snackbar";
import { useSnackbar } from "@/lib/useSnackbar";
import { useStationMeta } from "@/lib/hooks/useFuelPrices";
import { FuelType } from "@/lib/api";
import FuelTypeFilter from "@/components/fuel/FuelTypeFilter";
import StationMetaInfo from "@/components/fuel/StationMetaInfo";
import StationPriceChart from "@/components/fuel/StationPriceChart";
import StationDailyStatsChart from "@/components/fuel/StationDailyStatsChart";
import {
  LoadingSpinner,
  PageContainer,
  PageHeader,
  StackLayout,
} from "@/components/common";
import { StationPageHeader } from "@/components/station";

function StationDetailsContent({ stationId }: { stationId: string }) {
  const router = useRouter();
  const { t } = useTranslation();

  const { fuelType: selectedFuelType, setFuelType: setSelectedFuelType } =
    useFuelType();

  const handleFuelTypeChange = (fuelType: FuelType) => {
    setSelectedFuelType(fuelType);
  };

  const { snackbar, showSuccess, hideSnackbar } = useSnackbar();

  // Get station meta
  const { data: stationMeta } = useStationMeta(stationId);

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
      <Suspense
        fallback={
          <PageHeader title={t.fuelPrices.stationDetails} onBack={handleBack} />
        }
      >
        {stationId ? (
          <StationPageHeader
            stationId={stationId}
            title={t.fuelPrices.stationDetails}
            onBack={handleBack}
          />
        ) : (
          <PageHeader title={t.fuelPrices.stationDetails} onBack={handleBack} />
        )}
      </Suspense>

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
