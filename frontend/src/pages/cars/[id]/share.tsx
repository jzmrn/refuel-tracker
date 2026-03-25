import { useRouter } from "next/router";
import Snackbar from "@/components/common/Snackbar";
import { useSnackbar } from "@/lib/useSnackbar";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useCar } from "@/lib/hooks/useCars";
import ShareCarContent from "@/components/cars/ShareCarContent";
import { DynamicPage, PageHeader } from "@/components/common";

function ShareContent({ carId }: { carId: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: car } = useCar(carId);
  const { snackbar, showError, hideSnackbar } = useSnackbar();

  const handleBack = () => {
    router.back();
  };

  const handleSuccess = () => {
    router.back();
  };

  return (
    <>
      <PageHeader
        title={t.cars.addSharedUsers}
        subtitle={car ? `${car.name} (${car.year})` : undefined}
        onBack={handleBack}
      />

      {car && (
        <ShareCarContent
          car={car}
          onSuccess={handleSuccess}
          onError={showError}
        />
      )}

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

export default function AddSharedUsers() {
  return <DynamicPage>{(carId) => <ShareContent carId={carId} />}</DynamicPage>;
}
