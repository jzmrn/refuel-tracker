import { useState, useMemo, Suspense } from "react";
import { useRouter } from "next/router";
import Snackbar from "@/components/common/Snackbar";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import { useSnackbar } from "@/lib/useSnackbar";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import {
  useCar,
  useKilometerEntries,
  useUpdateKilometerEntry,
  useDeleteKilometerEntry,
} from "@/lib/hooks/useCars";
import { KilometerEntryUpdate } from "@/lib/api";
import {
  PageHeader,
  EmptyPanel,
  LoadingSpinner,
  PageContainer,
} from "@/components/common";
import CarPageHeader from "@/components/cars/CarPageHeader";
import DistanceForm from "@/components/distance/DistanceForm";
import CloseIcon from "@mui/icons-material/Close";

function EditDistanceContent({
  carId,
  timestamp,
}: {
  carId: string;
  timestamp: string;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: car } = useCar(carId);
  const { data: entriesData } = useKilometerEntries(carId, { limit: 1000 });
  const updateEntry = useUpdateKilometerEntry();
  const deleteEntry = useDeleteKilometerEntry();
  const { snackbar, showError, hideSnackbar } = useSnackbar();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Decode the timestamp from URL and find the matching entry
  const decodedTimestamp = useMemo(() => {
    try {
      return decodeURIComponent(timestamp);
    } catch {
      return timestamp;
    }
  }, [timestamp]);

  // Find the kilometer entry by timestamp
  const entry = useMemo(() => {
    if (!entriesData?.entries) return null;
    return entriesData.entries.find((e) => e.timestamp === decodedTimestamp);
  }, [entriesData?.entries, decodedTimestamp]);

  const handleBack = () => {
    router.back();
  };

  const handleSubmit = async (data: KilometerEntryUpdate) => {
    try {
      setIsSubmitting(true);
      await updateEntry.mutateAsync(data);
      router.back();
    } catch (error: any) {
      console.error("Error updating kilometer entry:", error);
      showError(
        error.response?.data?.detail ||
          t.kilometers.errorUpdatingEntry ||
          "Error updating entry.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!entry) return;
    setIsDeleteDialogOpen(false);
    try {
      setIsSubmitting(true);
      await deleteEntry.mutateAsync({ entryId: entry.id, carId });
      router.back();
    } catch (error: any) {
      console.error("Error deleting kilometer entry:", error);
      showError(
        error.response?.data?.detail ||
          t.kilometers.errorDeletingEntry ||
          "Error deleting entry.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle case where entry is not found
  if (!entry) {
    return (
      <EmptyPanel
        icon={
          <CloseIcon className="icon-xl text-gray-400 dark:text-gray-500 mb-3" />
        }
        title={t.kilometers.entryNotFound}
      />
    );
  }

  return (
    <>
      <DistanceForm
        mode="edit"
        carId={carId}
        car={car}
        initialData={entry}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        onCancel={handleBack}
        onDelete={() => setIsDeleteDialogOpen(true)}
      />

      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        title={t.kilometers.deleteEntryTitle}
        message={t.kilometers.deleteEntryMessage}
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

// Inner component that handles routing after router is ready
function EditDistancePageContent({
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
          <PageHeader title={t.kilometers.editKilometer} onBack={handleBack} />
        }
      >
        <CarPageHeader
          carId={carId}
          title={t.kilometers.editKilometer}
          onBack={handleBack}
        />
      </Suspense>

      {/* Content - inside separate Suspense */}
      <Suspense fallback={<LoadingSpinner />}>
        <EditDistanceContent carId={carId} timestamp={timestampStr} />
      </Suspense>
    </>
  );
}

// Outer wrapper that waits for router to be ready
export default function EditDistance() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id, timestamp } = router.query;
  const carId = typeof id === "string" ? id : undefined;
  const timestampStr = typeof timestamp === "string" ? timestamp : undefined;

  if (!router.isReady || !carId || !timestampStr) {
    return (
      <PageContainer>
        <PageHeader
          title={t.kilometers.editKilometer}
          onBack={() => router.back()}
        />
        <LoadingSpinner />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <EditDistancePageContent carId={carId} timestampStr={timestampStr} />
    </PageContainer>
  );
}
