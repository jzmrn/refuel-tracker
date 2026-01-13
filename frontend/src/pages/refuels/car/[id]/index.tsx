import { useRouter } from "next/router";
import { useState } from "react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import BarChartIcon from "@mui/icons-material/BarChart";
import Snackbar from "@/components/common/Snackbar";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import Panel from "@/components/common/Panel";
import RefuelList from "@/components/refuels/RefuelList";
import { useSnackbar } from "@/lib/useSnackbar";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import {
  useCarWithMinLoadTime,
  useRefuelMetricsWithMinLoadTime,
  useRevokeCarAccess,
  useDeleteCar,
} from "@/lib/hooks/useCars";
import CircularProgress from "@mui/material/CircularProgress";

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

  if (carError) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-4 md:py-8">
        <Panel>
          <div className="text-center">
            <p className="text-red-600 dark:text-red-400">
              {t.cars.failedToLoadCar}
            </p>
          </div>
        </Panel>
      </div>
    );
  }

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

      {carLoading && !isDeleting ? (
        <Panel>
          <div className="flex flex-col items-center gap-2">
            <CircularProgress size={20} />
            <span className="text-secondary">{t.common.loading}</span>
          </div>
        </Panel>
      ) : car ? (
        <div className="space-y-6">
          {/* Car Details */}
          <Panel
            title={car.name}
            actions={
              <button
                onClick={handleEditCar}
                disabled={!car.is_owner}
                className={`p-2 rounded-lg transition-colors ${
                  car.is_owner
                    ? "hover:bg-gray-100 dark:hover:bg-gray-700"
                    : "opacity-50 cursor-not-allowed"
                }`}
                aria-label={t.cars.editCar}
              >
                <EditIcon className="icon text-gray-600 dark:text-gray-400" />
              </button>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <span className="text-sm text-secondary">{t.cars.year}:</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {car.year}
                </p>
              </div>
              <div>
                <span className="text-sm text-secondary">
                  {t.cars.fuelTankSize}:
                </span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {car.fuel_tank_size} L
                </p>
              </div>
              <div>
                <span className="text-sm text-secondary">
                  {t.cars.fuelType}:
                </span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {car.fuel_type === "e5"
                    ? t.fuelPrices.e5
                    : car.fuel_type === "e10"
                    ? t.fuelPrices.e10
                    : car.fuel_type === "diesel"
                    ? t.fuelPrices.diesel
                    : car.fuel_type || "-"}
                </p>
              </div>
              <div>
                <span className="text-sm text-secondary">{t.cars.owner}:</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {car.owner_name}
                </p>
              </div>
            </div>
          </Panel>

          {/* Recent Refuel Events */}
          <Panel
            title={t.refuels.recentRefuels}
            actions={
              <div className="flex gap-2">
                <button
                  onClick={handleViewStats}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label={t.refuels.viewStatistics}
                >
                  <BarChartIcon className="icon text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  onClick={handleAddRefuel}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label={t.refuels.addEntry}
                >
                  <AddIcon className="icon text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            }
          >
            <RefuelList refuels={refuels} loading={refuelsLoading} />
          </Panel>

          {/* Shared Users & Actions - only show if user is owner */}
          {car.is_owner && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Shared Users Section */}
              <Panel
                title={t.cars.sharedWith}
                actions={
                  <button
                    onClick={handleAddSharedUsers}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    aria-label={t.cars.addSharedUsers}
                  >
                    <AddIcon className="icon text-gray-600 dark:text-gray-400" />
                  </button>
                }
              >
                {car.shared_users && car.shared_users.length > 0 ? (
                  <div className="space-y-3">
                    {car.shared_users.map((user) => (
                      <div
                        key={user.user_id}
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700"
                      >
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {user.user_name}
                          </div>
                          <div className="text-sm text-secondary">
                            {user.user_email}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveSharedUser(user.user_id)}
                          disabled={revokeAccess.isPending}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                          aria-label={t.cars.removeAccess}
                        >
                          <DeleteIcon className="icon" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-secondary text-sm">
                    {t.cars.noSharedAccess}
                  </p>
                )}
              </Panel>

              {/* Actions Panel */}
              <Panel title={t.common.actions}>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => setIsDeleteDialogOpen(true)}
                    disabled={isDeleting}
                    className="w-full btn-danger py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <CircularProgress size={20} sx={{ color: "white" }} />
                        <span>{t.common.loading}</span>
                      </>
                    ) : (
                      t.cars.deleteCar
                    )}
                  </button>
                </div>
              </Panel>
            </div>
          )}
        </div>
      ) : null}

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
