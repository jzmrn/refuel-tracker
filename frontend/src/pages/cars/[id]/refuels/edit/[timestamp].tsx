import { useState, useMemo, Suspense } from "react";
import { useRouter } from "next/router";
import Snackbar from "@/components/common/Snackbar";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import { useSnackbar } from "@/lib/useSnackbar";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import {
  useCar,
  useRefuelMetrics,
  useUpdateRefuelMetric,
  useDeleteRefuelMetric,
} from "@/lib/hooks/useCars";
import { RefuelMetricUpdate } from "@/lib/api";
import {
  PageHeader,
  EmptyPanel,
  LoadingSpinner,
  PageContainer,
} from "@/components/common";
import CarPageHeader from "@/components/cars/CarPageHeader";
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
  const deleteRefuel = useDeleteRefuelMetric();
  const { snackbar, showError, hideSnackbar } = useSnackbar();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

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
      router.back();
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

  const handleDelete = async () => {
    setIsDeleteDialogOpen(false);
    try {
      setIsSubmitting(true);
      await deleteRefuel.mutateAsync({ timestamp: decodedTimestamp, carId });
      router.back();
    } catch (error: any) {
      console.error("Error deleting refuel:", error);
      showError(
        error.response?.data?.detail ||
          t.refuels.errorDeletingRefuel ||
          "Error deleting refuel entry.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle case where refuel entry is not found
  if (!refuelEntry) {
    return (
      <EmptyPanel
        icon={
          <CloseIcon className="icon-xl text-gray-400 dark:text-gray-500 mb-3" />
        }
        title={t.refuels.refuelNotFound}
      />
    );
  }

  return (
    <>
      <RefuelForm
        mode="edit"
        carId={carId}
        car={car}
        initialData={refuelEntry}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        onCancel={handleBack}
        onDelete={() => setIsDeleteDialogOpen(true)}
      />

      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        title={t.refuels.deleteRefuelTitle}
        message={t.refuels.deleteRefuelMessage}
        confirmText={t.common.delete}
        cancelText={t.common.cancel}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteDialogOpen(false)}
        variant="danger"
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

// Inner component that receives carId and timestamp - hooks only called when params are available
function EditRefuelPageContent({
  carId,
  timestampStr,
}: {
  carId: string;
  timestampStr: string;
}) {
  const { t } = useTranslation();
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  return (
    <>
      {/* Header with car data - inside Suspense */}
      <Suspense
        fallback={
          <PageHeader title={t.refuels.editRefuel} onBack={handleBack} />
        }
      >
        <CarPageHeader
          carId={carId}
          title={t.refuels.editRefuel}
          onBack={handleBack}
        />
      </Suspense>

      {/* Content - inside separate Suspense */}
      <Suspense fallback={<LoadingSpinner />}>
        <EditRefuelContent carId={carId} timestamp={timestampStr} />
      </Suspense>
    </>
  );
}

// Outer wrapper that waits for router to be ready
export default function EditRefuel() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id, timestamp } = router.query;
  const carId = typeof id === "string" ? id : undefined;
  const timestampStr = typeof timestamp === "string" ? timestamp : undefined;

  if (!router.isReady || !carId || !timestampStr) {
    return (
      <PageContainer>
        <PageHeader title={t.refuels.editRefuel} onBack={() => router.back()} />
        <LoadingSpinner />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <EditRefuelPageContent carId={carId} timestampStr={timestampStr} />
    </PageContainer>
  );
}
