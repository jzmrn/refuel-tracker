import React, { useState } from "react";
import { Car, apiService } from "../../lib/api";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ConfirmationDialog from "../common/ConfirmationDialog";
import CarForm from "./CarForm";
import { useTranslation } from "../../lib/i18n/LanguageContext";

interface CarsTabProps {
  cars: Car[];
  loading: boolean;
  onCarUpdated: () => void;
  onCarDeleted: () => void;
  onError: (message: string) => void;
}

const CarsTab: React.FC<CarsTabProps> = ({
  cars,
  loading,
  onCarUpdated,
  onCarDeleted,
  onError,
}) => {
  const { t } = useTranslation();
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [deletingCar, setDeletingCar] = useState<Car | null>(null);

  const ownedCars = cars.filter((car) => car.is_owner);
  const sharedWithMeCars = cars.filter((car) => !car.is_owner);

  const handleEdit = (car: Car) => {
    setEditingCar(car);
  };

  const handleDelete = (car: Car) => {
    setDeletingCar(car);
  };

  const confirmDelete = async () => {
    if (!deletingCar) return;

    try {
      await apiService.deleteCar(deletingCar.id);
      setDeletingCar(null);
      onCarDeleted();
    } catch (error: any) {
      console.error("Error deleting car:", error);
      setDeletingCar(null);
      onError(t.cars.failedToDeleteCar);
    }
  };

  const handleEditSuccess = () => {
    setEditingCar(null);
    onCarUpdated();
  };

  const handleCancel = () => {
    setEditingCar(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* My Owned Cars */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t.cars.myCars} ({ownedCars.length})
        </h3>

        {ownedCars.length === 0 ? (
          <div className="card text-center py-12">
            <DirectionsCarIcon className="icon-xl text-gray-600 dark:text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t.cars.noCarsYet}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ownedCars.map((car) => (
              <div
                key={car.id}
                className="card hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <DirectionsCarIcon className="icon-md text-blue-600 dark:text-blue-400" />
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {car.name}
                    </h4>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(car)}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title={t.common.edit}
                    >
                      <EditIcon className="icon-sm" />
                    </button>
                    <button
                      onClick={() => handleDelete(car)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title={t.common.delete}
                    >
                      <DeleteIcon className="icon-sm" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {car.year && (
                    <p className="text-gray-700 dark:text-gray-300">
                      <span className="font-medium">{t.cars.year}:</span>{" "}
                      {car.year}
                    </p>
                  )}
                  {car.fuel_tank_size && (
                    <p className="text-gray-700 dark:text-gray-300">
                      <span className="font-medium">Fuel Tank:</span>{" "}
                      {car.fuel_tank_size} L
                    </p>
                  )}
                  {car.shared_users && car.shared_users.length > 0 && (
                    <p className="text-gray-700 dark:text-gray-300">
                      <span className="font-medium">Shared with:</span>{" "}
                      {car.shared_users.length}{" "}
                      {car.shared_users.length === 1 ? "user" : "users"}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cars Shared With Me */}
      {sharedWithMeCars.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t.cars.sharedWithMe} ({sharedWithMeCars.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sharedWithMeCars.map((car) => (
              <div
                key={car.id}
                className="card hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start gap-2 mb-3">
                  <DirectionsCarIcon className="icon-md text-purple-600 dark:text-purple-400" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {car.name}
                    </h4>
                    <p className="text-xs text-purple-600 dark:text-purple-400">
                      {t.cars.sharedBy} {car.shared_by}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <p className="text-gray-700 dark:text-gray-300">
                    <span className="font-medium">{t.cars.year}:</span>{" "}
                    {car.year}
                  </p>
                  <p className="text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Fuel Tank:</span>{" "}
                    {car.fuel_tank_size} L
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Deleting Car */}
      <ConfirmationDialog
        isOpen={!!deletingCar}
        title={t.common.delete + " " + t.cars.title.slice(0, -1)}
        message={t.cars.deleteCarConfirm}
        confirmText={t.common.delete}
        cancelText={t.common.cancel}
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeletingCar(null)}
      />

      {/* Edit Car Dialog */}
      {editingCar && (
        <div className="modal-overlay">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t.cars.editCar}
              </h3>
              <button
                onClick={handleCancel}
                className="rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <svg
                  className="w-5 h-5 text-gray-500 dark:text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(90vh-4rem)]">
              <CarForm
                car={editingCar}
                onSuccess={handleEditSuccess}
                onCancel={handleCancel}
                onError={onError}
                showCard={false}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CarsTab;
