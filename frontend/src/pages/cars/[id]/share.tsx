import { Suspense } from "react";
import { useRouter } from "next/router";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Snackbar from "@/components/common/Snackbar";
import { useSnackbar } from "@/lib/useSnackbar";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useCar } from "@/lib/hooks/useCars";
import ShareCarContent from "@/components/cars/ShareCarContent";
import { LoadingSpinner } from "@/components/common";

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
            <h1 className="heading-1">{t.cars.addSharedUsers}</h1>
            {car && (
              <p className="text-secondary text-sm mt-1">
                {car.name} ({car.year})
              </p>
            )}
          </div>
        </div>
      </div>

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
  const router = useRouter();
  const { id } = router.query;
  const carId = typeof id === "string" ? id : undefined;

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 md:py-8">
      <Suspense fallback={<LoadingSpinner />}>
        {carId ? <ShareContent carId={carId} /> : <LoadingSpinner />}
      </Suspense>
    </div>
  );
}
