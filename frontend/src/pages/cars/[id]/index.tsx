import { useRouter } from "next/router";
import { Suspense, useState } from "react";
import Snackbar from "@/components/common/Snackbar";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import { LoadingSpinner, PageContainer, PageHeader } from "@/components/common";
import CarDetailsContent from "@/components/cars/CarDetailsContent";
import { useSnackbar } from "@/lib/useSnackbar";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useRevokeCarAccess, useDeleteCar, useCar } from "@/lib/hooks/useCars";
import { RefuelMetric } from "@/lib/api";

export default function CarDetails() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = router.query;
  const carId = typeof id === "string" ? id : undefined;

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: car } = useCar(carId ?? "");
  const revokeAccess = useRevokeCarAccess();
  const deleteCar = useDeleteCar();
  const { snackbar, showError, showSuccess, hideSnackbar } = useSnackbar();

  const handleBack = () => {
    // Navigate explicitly to cars list to avoid history stack issues
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

  const handleRemoveSharedUser = async (userId: string) => {
    if (!carId) return;
    try {
      await revokeAccess.mutateAsync({ carId, userId });
      showSuccess(t.cars.accessRevokedSuccess);
    } catch (error: any) {
      console.error("Error revoking access:", error);
      showError(error.response?.data?.detail || t.cars.failedToRevokeAccess);
    }
  };

  const handleDeleteCar = async () => {
    if (!carId) return;
    setIsDeleteDialogOpen(false);
    setIsDeleting(true);
    try {
      await deleteCar.mutateAsync(carId);
      // Navigate back immediately after successful deletion
      router.push("/cars");
    } catch (error: any) {
      console.error("Error deleting car:", error);
      showError(error.response?.data?.detail || t.cars.failedToDeleteCar);
      setIsDeleting(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title={t.cars.carDetails}
        subtitle={car ? `${car.name} (${car.year})` : undefined}
        onBack={handleBack}
      />

      <Suspense fallback={<LoadingSpinner />}>
        {/* This ternary avoids rendering an empty page since the carId is loaded from the path */}
        {carId ? (
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
            onAddKilometer={handleAddKilometer}
            onAddSharedUsers={handleAddSharedUsers}
            onRemoveSharedUser={handleRemoveSharedUser}
          />
        ) : (
          <LoadingSpinner />
        )}
      </Suspense>

      {/* Delete Confirmation Dialog */}
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

      {/* Snackbar */}
      {snackbar.isVisible && (
        <Snackbar
          message={snackbar.message}
          type={snackbar.type}
          onClose={hideSnackbar}
          isVisible={true}
        />
      )}
    </PageContainer>
  );
}
