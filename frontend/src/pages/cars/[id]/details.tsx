import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Snackbar from "@/components/common/Snackbar";
import { useSnackbar } from "@/lib/useSnackbar";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useCarWithMinLoadTime, useUpdateCar } from "@/lib/hooks/useCars";
import { CarUpdate } from "@/lib/api";
import { CarDetailsForm } from "@/components/cars/CarDetailsForm";

export default function EditCarDetails() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = router.query;
  const carId = typeof id === "string" ? id : undefined;

  const {
    data: car,
    isLoading: carLoading,
    isError,
  } = useCarWithMinLoadTime(carId);

  const updateCar = useUpdateCar();
  const { snackbar, showError, hideSnackbar } = useSnackbar();

  const [formData, setFormData] = useState<{
    name: string;
    year: number | undefined;
    fuel_tank_size: number | undefined;
    fuel_type: string;
  }>({
    name: "",
    year: undefined,
    fuel_tank_size: undefined,
    fuel_type: "",
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
        fuel_type: car.fuel_type || "",
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
    router.back();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !carId ||
      !formData.name ||
      !formData.year ||
      !formData.fuel_tank_size ||
      !formData.fuel_type
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

      // Navigate back to car details
      router.back();
    } catch (error: any) {
      console.error("Error updating car:", error);
      showError(error.response?.data?.detail || t.cars.failedToUpdateCar);
    } finally {
      setIsSubmitting(false);
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
            <h1 className="heading-1">{t.cars.editCar}</h1>
          </div>
        </div>
      </div>

      {/* Form */}
      <CarDetailsForm
        isLoading={carLoading}
        isError={isError}
        formData={formData}
        hasData={!!car}
        onFormDataChange={setFormData}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
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
