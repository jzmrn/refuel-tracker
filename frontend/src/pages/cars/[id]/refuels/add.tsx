import { useState } from "react";
import { useRouter } from "next/router";
import Snackbar from "@/components/common/Snackbar";
import { useSnackbar } from "@/lib/useSnackbar";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useCreateRefuelMetric, useCar } from "@/lib/hooks/useCars";
import { RefuelMetricCreate, RefuelMetricUpdate } from "@/lib/api";
import { DynamicPage, PageHeader } from "@/components/common";
import RefuelForm from "@/components/refuels/RefuelForm";

function AddRefuelContent({ carId }: { carId: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: car } = useCar(carId);
  const createRefuel = useCreateRefuelMetric();
  const { snackbar, showError, hideSnackbar } = useSnackbar();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBack = () => {
    router.back();
  };

  const handleSubmit = async (data: RefuelMetricCreate) => {
    try {
      setIsSubmitting(true);
      await createRefuel.mutateAsync(data as RefuelMetricCreate);
      router.push(`/cars/${carId}`);
    } catch (error: any) {
      console.error("Error creating refuel:", error);
      showError(error.response?.data?.detail || t.refuels.errorAddingRefuel);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        title={t.navigation.addEntry}
        subtitle={car ? `${car.name} (${car.year})` : undefined}
        onBack={handleBack}
      />

      <RefuelForm
        mode="add"
        carId={carId}
        car={car}
        isSubmitting={isSubmitting}
        onSubmit={
          handleSubmit as (
            data: RefuelMetricCreate | RefuelMetricUpdate,
          ) => Promise<void>
        }
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

export default function AddRefuel() {
  return (
    <DynamicPage>{(carId) => <AddRefuelContent carId={carId} />}</DynamicPage>
  );
}
