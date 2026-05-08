import { useState } from "react";
import { useRouter } from "next/router";
import Snackbar from "@/components/common/Snackbar";
import { useSnackbar } from "@/lib/useSnackbar";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useCreateKilometerEntry, useCar } from "@/lib/hooks/useCars";
import { KilometerEntryCreate } from "@/lib/api";
import { DynamicPage, PageHeader } from "@/components/common";
import DistanceForm from "@/components/distance/DistanceForm";

function AddKilometerContent({ carId }: { carId: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: car } = useCar(carId);
  const createKilometerEntry = useCreateKilometerEntry();
  const { snackbar, showError, hideSnackbar } = useSnackbar();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBack = () => {
    router.back();
  };

  const handleSubmit = async (data: KilometerEntryCreate) => {
    try {
      setIsSubmitting(true);
      await createKilometerEntry.mutateAsync(data);
      router.push(`/cars/${carId}`);
    } catch (error: any) {
      console.error("Error creating kilometer entry:", error);
      showError(error.response?.data?.detail || t.kilometers.errorAddingEntry);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        title={t.kilometers.addKilometer}
        subtitle={car ? `${car.name} (${car.year})` : undefined}
        onBack={handleBack}
      />

      <DistanceForm
        mode="add"
        carId={carId}
        car={car}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        onCancel={handleBack}
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

export default function AddKilometer() {
  return (
    <DynamicPage>
      {(carId) => <AddKilometerContent carId={carId} />}
    </DynamicPage>
  );
}
