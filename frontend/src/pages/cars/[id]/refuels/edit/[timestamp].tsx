import { useState, useMemo } from "react";
import { useRouter } from "next/router";
import Snackbar from "@/components/common/Snackbar";
import { useSnackbar } from "@/lib/useSnackbar";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import {
  useCar,
  useRefuelMetrics,
  useUpdateRefuelMetric,
} from "@/lib/hooks/useCars";
import { RefuelMetricUpdate } from "@/lib/api";
import {
  PageHeader,
  EmptyPanel,
  LoadingSpinner,
  PageContainer,
} from "@/components/common";
import RefuelForm from "@/components/refuels/RefuelForm";
import CloseIcon from "@mui/icons-material/Close";

function EditRefuelContent({
  carId,
  timestamp,
}: {
  carId: string;
  timestamp: string;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: car } = useCar(carId);
  const { data: refuels } = useRefuelMetrics(carId);
  const updateRefuel = useUpdateRefuelMetric();
  const { snackbar, showError, hideSnackbar } = useSnackbar();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Decode the timestamp from URL and find the matching refuel
  const decodedTimestamp = useMemo(() => {
    try {
      return decodeURIComponent(timestamp);
    } catch {
      return timestamp;
    }
  }, [timestamp]);

  // Find the refuel entry by timestamp
  const refuelEntry = useMemo(() => {
    if (!refuels) return null;
    return refuels.find((r) => r.timestamp === decodedTimestamp);
  }, [refuels, decodedTimestamp]);

  const handleBack = () => {
    router.back();
  };

  const handleSubmit = async (data: RefuelMetricUpdate) => {
    try {
      setIsSubmitting(true);
      await updateRefuel.mutateAsync(data as RefuelMetricUpdate);
      router.push(`/cars/${carId}`);
    } catch (error: any) {
      console.error("Error updating refuel:", error);
      showError(
        error.response?.data?.detail ||
          t.refuels.errorUpdatingRefuel ||
          "Error updating refuel entry.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle case where refuel entry is not found
  if (!refuelEntry) {
    return (
      <>
        <PageHeader
          title={t.refuels.editRefuel || "Edit Refuel"}
          onBack={handleBack}
        />
        <EmptyPanel
          icon={
            <CloseIcon className="icon-xl text-gray-400 dark:text-gray-500 mb-3" />
          }
          title={t.refuels.refuelNotFound || "Refuel entry not found"}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={t.refuels.editRefuel || "Edit Refuel"}
        subtitle={car ? `${car.name} (${car.year})` : undefined}
        onBack={handleBack}
      />

      <RefuelForm
        mode="edit"
        carId={carId}
        car={car}
        initialData={refuelEntry}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        onCancel={handleBack}
      />

      {snackbar.isVisible && (
        <Snackbar
          message={snackbar.message}
          type={snackbar.type}
          onClose={hideSnackbar}
          isVisible={true}
        />
      )}
    </>
  );
}

export default function EditRefuel() {
  const router = useRouter();
  const { id: carId, timestamp } = router.query;

  // Wait for query parameters to be available
  if (
    !carId ||
    !timestamp ||
    typeof carId !== "string" ||
    typeof timestamp !== "string"
  ) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[50vh]">
          <LoadingSpinner />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <EditRefuelContent carId={carId} timestamp={timestamp} />
    </PageContainer>
  );
}
