import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PageTransition from "@/components/common/PageTransition";
import Snackbar from "@/components/common/Snackbar";
import { useSnackbar } from "@/lib/useSnackbar";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { usePathAnimation } from "@/lib/hooks/usePathAnimation";
import { useCarWithMinLoadTime, useUpdateCar } from "@/lib/hooks/useCars";
import { CarUpdate } from "@/lib/api";
import CircularProgress from "@mui/material/CircularProgress";

export default function EditCarDetails() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = router.query;
  const carId = typeof id === "string" ? id : undefined;

  const { isVisible, animationDirection, navigateBackWithAnimation } =
    usePathAnimation({ currentPath: `/refuels/car/${id || ""}/details` });

  const {
    data: car,
    isLoading: carLoading,
    error: carError,
  } = useCarWithMinLoadTime(carId);

  const updateCar = useUpdateCar();
  const { snackbar, showError, hideSnackbar } = useSnackbar();

  const [formData, setFormData] = useState<{
    name: string;
    year: number | undefined;
    fuel_tank_size: number | undefined;
  }>({
    name: "",
    year: undefined,
    fuel_tank_size: undefined,
  });

  const [sharedUserIds, setSharedUserIds] = useState<string[]>([]);
  const [sharedUsersDetails, setSharedUsersDetails] = useState<
    Array<{ id: string; name: string; email: string }>
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form data when car is loaded
  useEffect(() => {
    if (car) {
      setFormData({
        name: car.name,
        year: car.year,
        fuel_tank_size: car.fuel_tank_size,
      });

      if (car.is_owner && car.shared_users) {
        const userIds = car.shared_users.map((u) => u.user_id);
        const userDetails = car.shared_users.map((u) => ({
          id: u.user_id,
          name: u.user_name,
          email: u.user_email,
        }));
        setSharedUserIds(userIds);
        setSharedUsersDetails(userDetails);
      }
    }
  }, [car]);

  const handleBack = () => {
    navigateBackWithAnimation();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !carId ||
      !formData.name ||
      !formData.year ||
      !formData.fuel_tank_size
    ) {
      showError(t.cars.fillAllRequiredFields);
      return;
    }

    try {
      setIsSubmitting(true);
      const updateData: CarUpdate = {
        ...formData,
        shared_user_ids: sharedUserIds,
      };
      await updateCar.mutateAsync({ carId, update: updateData });

      // Navigate back to car details with backward animation
      navigateBackWithAnimation();
    } catch (error: any) {
      console.error("Error updating car:", error);
      showError(error.response?.data?.detail || t.cars.failedToUpdateCar);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (carError) {
    return (
      <PageTransition
        isVisible={isVisible}
        animationDirection={animationDirection}
        className="max-w-7xl mx-auto px-4 py-4 md:py-8"
      >
        <div className="panel text-center">
          <p className="text-red-600 dark:text-red-400">
            {t.cars.failedToLoadCar}
          </p>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition
      isVisible={isVisible}
      animationDirection={animationDirection}
      className="max-w-7xl mx-auto px-4 py-4 md:py-8"
    >
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
            <h1 className="heading-1">{t.cars.editCar}</h1>
          </div>
        </div>
      </div>

      {/* Form */}
      {carLoading ? (
        <div className="panel">
          <div className="flex flex-col items-center gap-2">
            <CircularProgress size={20} />
            <span className="text-secondary">{t.common.loading}</span>
          </div>
        </div>
      ) : car ? (
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="panel">
            <div className="form-container">
              {/* Car Name - full width */}
              <div className="field-group">
                <label htmlFor="name" className="label">
                  {t.cars.carName} *
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="input"
                  required
                />
              </div>

              {/* Year and Fuel Tank Size - side by side on sm+ */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Year */}
                <div className="field-group">
                  <label htmlFor="year" className="label">
                    {t.cars.year} *
                  </label>
                  <input
                    type="number"
                    id="year"
                    value={formData.year || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        year: parseInt(e.target.value) || undefined,
                      })
                    }
                    className="input"
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    required
                  />
                </div>

                {/* Fuel Tank Size */}
                <div className="field-group">
                  <label htmlFor="fuel_tank_size" className="label">
                    {t.cars.fuelTankSize} (L) *
                  </label>
                  <input
                    type="number"
                    id="fuel_tank_size"
                    value={formData.fuel_tank_size || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        fuel_tank_size: parseFloat(e.target.value) || undefined,
                      })
                    }
                    className="input"
                    step="0.1"
                    min="1"
                    required
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="form-actions">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <CircularProgress size={20} color="inherit" />
                      {t.common.saving}
                    </>
                  ) : (
                    t.cars.saveChanges
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}

      {/* Snackbar */}
      {snackbar.isVisible && (
        <Snackbar
          message={snackbar.message}
          type={snackbar.type}
          onClose={hideSnackbar}
          isVisible={true}
        />
      )}
    </PageTransition>
  );
}
