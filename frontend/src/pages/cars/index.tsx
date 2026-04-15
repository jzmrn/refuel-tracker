import { Suspense } from "react";
import { useRouter } from "next/router";
import AddIcon from "@mui/icons-material/Add";
import CarList from "@/components/cars/CarList";
import Snackbar from "@/components/common/Snackbar";
import {
  LoadingSpinner,
  PageContainer,
  PageHeader,
  IconButton,
} from "@/components/common";
import { useSnackbar } from "@/lib/useSnackbar";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useCars } from "@/lib/hooks/useCars";

function CarsContent({ onCarClick }: { onCarClick: (carId: string) => void }) {
  const { data: cars } = useCars();

  return <CarList cars={cars} onCarClick={onCarClick} />;
}

export default function RefuelsIndex() {
  const { t } = useTranslation();
  const router = useRouter();

  const { snackbar, hideSnackbar } = useSnackbar();

  const handleAddCar = () => {
    router.push("/cars/add");
  };

  const handleCarClick = (carId: string) => {
    router.push(`/cars/${carId}`);
  };

  return (
    <PageContainer>
      <PageHeader
        title={t.cars.title}
        actions={
          <IconButton
            onClick={handleAddCar}
            icon={<AddIcon className="icon text-gray-600 dark:text-gray-400" />}
            ariaLabel={t.cars.addCar}
          />
        }
      />

      <Suspense fallback={<LoadingSpinner />}>
        <CarsContent onCarClick={handleCarClick} />
      </Suspense>

      {/* Snackbar */}
      {snackbar.isVisible && (
        <Snackbar
          message={snackbar.message}
          type={snackbar.type}
          onClose={hideSnackbar}
          isVisible={true}
        />
      )}
    </PageContainer>
  );
}
