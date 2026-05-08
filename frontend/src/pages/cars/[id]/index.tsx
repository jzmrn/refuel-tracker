import { useRouter } from "next/router";
import { Suspense, useState } from "react";
import Snackbar from "@/components/common/Snackbar";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import { LoadingSpinner, PageContainer, PageHeader } from "@/components/common";
import CarDetailsContent from "@/components/cars/CarDetailsContent";
import CarPageHeader from "@/components/cars/CarPageHeader";
import { useSnackbar } from "@/lib/useSnackbar";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useRevokeCarAccess, useDeleteCar } from "@/lib/hooks/useCars";
import { RefuelMetric, KilometerEntry } from "@/lib/api";

// Content component that handles all the car details logic
function CarDetailsPageContent({ carId }: { carId: string }) {
  const { t } = useTranslation();
  const router = useRouter();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const revokeAccess = useRevokeCarAccess();
  const deleteCar = useDeleteCar();
  const { snackbar, showError, showSuccess, hideSnackbar } = useSnackbar();

  const handleBack = () => {
    router.push("/cars");
  };

  const handleEditCar = () => {
    router.push(`/cars/${carId}/edit`);
  };

  const handleAddRefuel = () => {
    router.push(`/cars/${carId}/refuels/add`);
  };

  const handleViewAllRefuels = () => {
    router.push(`/cars/${carId}/refuels/all`);
  };

  const handleEditRefuel = (refuel: RefuelMetric) => {
    const encodedTimestamp = encodeURIComponent(refuel.timestamp);
    router.push(`/cars/${carId}/refuels/edit/${encodedTimestamp}`);
  };

  const handleAddSharedUsers = () => {
    router.push(`/cars/${carId}/share`);
  };

  const handleViewStats = () => {
    router.push(`/cars/${carId}/refuels`);
  };

  const handleAddKilometer = () => {
    router.push(`/cars/${carId}/distance/add`);
  };

  const handleViewKilometerChart = () => {
    router.push(`/cars/${carId}/distance`);
  };

  const handleViewAllKilometers = () => {
    router.push(`/cars/${carId}/distance/all`);
  };

  const handleEditKilometer = (entry: KilometerEntry) => {
    const encodedTimestamp = encodeURIComponent(entry.timestamp);
    router.push(`/cars/${carId}/distance/edit/${encodedTimestamp}`);
  };

  const handleRemoveSharedUser = async (userId: string) => {
    try {
      await revokeAccess.mutateAsync({ carId, userId });
      showSuccess(t.cars.accessRevokedSuccess);
    } catch (error: any) {
      console.error("Error revoking access:", error);
      showError(error.response?.data?.detail || t.cars.failedToRevokeAccess);
    }
  };

  const handleDeleteCar = async () => {
    setIsDeleteDialogOpen(false);
    setIsDeleting(true);
    try {
      await deleteCar.mutateAsync(carId);
      router.push("/cars");
    } catch (error: any) {
      console.error("Error deleting car:", error);
      showError(error.response?.data?.detail || t.cars.failedToDeleteCar);
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* Header with car data - inside Suspense */}
      <Suspense
        fallback={<PageHeader title={t.cars.carDetails} onBack={handleBack} />}
      >
        <CarPageHeader
          carId={carId}
          title={t.cars.carDetails}
          onBack={handleBack}
        />
      </Suspense>

      {/* Content - inside separate Suspense */}
      <Suspense fallback={<LoadingSpinner />}>
        <CarDetailsContent
          carId={carId}
          isDeleting={isDeleting}
          isRevoking={revokeAccess.isPending}
          onEditCar={handleEditCar}
          onDeleteCar={() => setIsDeleteDialogOpen(true)}
          onViewStats={handleViewStats}
          onAddRefuel={handleAddRefuel}
          onViewAllRefuels={handleViewAllRefuels}
          onEditRefuel={handleEditRefuel}
          onViewKilometerChart={handleViewKilometerChart}
          onViewAllKilometers={handleViewAllKilometers}
          onAddKilometer={handleAddKilometer}
          onEditKilometer={handleEditKilometer}
          onAddSharedUsers={handleAddSharedUsers}
          onRemoveSharedUser={handleRemoveSharedUser}
        />
      </Suspense>

      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        title={t.cars.deleteCarTitle}
        message={t.cars.deleteCarMessage}
        confirmText={t.common.delete}
        cancelText={t.common.cancel}
        onConfirm={handleDeleteCar}
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

export default function CarDetails() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = router.query;
  const carId = typeof id === "string" ? id : undefined;

  // Wait for router to be ready - this prevents hydration mismatch
  // because router.query is empty on server but populated on client
  if (!router.isReady || !carId) {
    return (
      <PageContainer>
        <PageHeader
          title={t.cars.carDetails}
          onBack={() => router.push("/cars")}
        />
        <LoadingSpinner />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <CarDetailsPageContent carId={carId} />
    </PageContainer>
  );
}
