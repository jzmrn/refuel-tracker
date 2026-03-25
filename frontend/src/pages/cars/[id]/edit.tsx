import { Suspense, useState, useEffect, startTransition } from "react";
import { useRouter } from "next/router";
import Snackbar from "@/components/common/Snackbar";
import { useSnackbar } from "@/lib/useSnackbar";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useCar, useUpdateCar } from "@/lib/hooks/useCars";
import { CarUpdate } from "@/lib/api";
import { CarDetailsForm } from "@/components/cars/CarDetailsForm";
import { DynamicPage, PageHeader } from "@/components/common";

function EditCarDetailsContent({ carId }: { carId: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: car } = useCar(carId);

  const updateCar = useUpdateCar();
  const { snackbar, showError, hideSnackbar } = useSnackbar();

  const [formData, setFormData] = useState<{
    name: string;
    year: number | undefined;
    fuel_tank_size: number | undefined;
    fuel_type: string;
  }>({
    name: car?.name || "",
    year: car?.year,
    fuel_tank_size: car?.fuel_tank_size,
    fuel_type: car?.fuel_type || "",
  });

  const [sharedUserIds, setSharedUserIds] = useState<string[]>([]);
  const [sharedUsersDetails, setSharedUsersDetails] = useState<
    Array<{ id: string; name: string; email: string }>
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize shared users when car is loaded
  useEffect(() => {
    if (car?.is_owner && car.shared_users) {
      const userIds = car.shared_users.map((u) => u.user_id);
      const userDetails = car.shared_users.map((u) => ({
        id: u.user_id,
        name: u.user_name,
        email: u.user_email,
      }));
      startTransition(() => {
        setSharedUserIds(userIds);
        setSharedUsersDetails(userDetails);
      });
    }
  }, [car]);

  const handleBack = () => {
    router.back();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
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
    <>
      <PageHeader title={t.cars.editCar} onBack={handleBack} />

      {/* Form */}
      <CarDetailsForm
        formData={formData}
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
    </>
  );
}

export default function EditCarDetails() {
  return (
    <DynamicPage>
      {(carId) => <EditCarDetailsContent carId={carId} />}
    </DynamicPage>
  );
}
