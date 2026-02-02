import { useRouter } from "next/router";
import { useState } from "react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Snackbar from "@/components/common/Snackbar";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import CarDetailsContent from "@/components/cars/CarDetailsContent";
import { useSnackbar } from "@/lib/useSnackbar";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import {
  useCarWithMinLoadTime,
  useRefuelMetricsWithMinLoadTime,
  useKilometerEntriesWithMinLoadTime,
  useRevokeCarAccess,
  useDeleteCar,
} from "@/lib/hooks/useCars";

export default function CarDetails() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = router.query;
  const carId = typeof id === "string" ? id : undefined;

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch car details
  const {
    data: car,
    isLoading: carLoading,
    error: carError,
  } = useCarWithMinLoadTime(carId);

  // Fetch recent refuels (limit 5)
  const { data: refuels = [], isLoading: refuelsLoading } =
    useRefuelMetricsWithMinLoadTime(carId, {
      limit: 5,
    });

  // Fetch recent kilometer entries (limit 5)
  const { data: kilometerEntries = [], isLoading: kilometersLoading } =
    useKilometerEntriesWithMinLoadTime(carId, {
      limit: 5,
    });

  const revokeAccess = useRevokeCarAccess();
  const deleteCar = useDeleteCar();
  const { snackbar, showError, showSuccess, hideSnackbar } = useSnackbar();

  const handleBack = () => {
    // Navigate explicitly to cars list to avoid history stack issues
    router.push("/refuels");
  };

  const handleEditCar = () => {
    router.push(`/refuels/car/${carId}/details`);
  };

  const handleAddRefuel = () => {
    router.push(`/refuels/car/${carId}/add-refuel`);
  };

  const handleAddSharedUsers = () => {
    router.push(`/refuels/car/${carId}/share`);
  };

  const handleViewStats = () => {
    router.push(`/refuels/car/${carId}/stats`);
  };

  const handleAddKilometer = () => {
    router.push(`/refuels/car/${carId}/add-kilometer`);
  };

  const handleViewKilometerChart = () => {
    router.push(`/refuels/car/${carId}/kilometer-stats`);
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
      router.push("/refuels");
    } catch (error: any) {
      console.error("Error deleting car:", error);
      showError(error.response?.data?.detail || t.cars.failedToDeleteCar);
      setIsDeleting(false);
    }
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
            <h1 className="heading-1">{t.cars.carDetails}</h1>
          </div>
        </div>
      </div>

      <CarDetailsContent
        car={car}
        carLoading={carLoading}
        carError={carError}
        refuels={refuels}
        refuelsLoading={refuelsLoading}
        kilometerEntries={kilometerEntries}
        kilometersLoading={kilometersLoading}
        isDeleting={isDeleting}
        isRevoking={revokeAccess.isPending}
        onEditCar={handleEditCar}
        onDeleteCar={() => setIsDeleteDialogOpen(true)}
        onViewStats={handleViewStats}
        onAddRefuel={handleAddRefuel}
        onViewKilometerChart={handleViewKilometerChart}
        onAddKilometer={handleAddKilometer}
        onAddSharedUsers={handleAddSharedUsers}
        onRemoveSharedUser={handleRemoveSharedUser}
      />

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
    </div>
  );
}
