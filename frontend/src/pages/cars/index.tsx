import { useRouter } from "next/router";
import AddIcon from "@mui/icons-material/Add";
import CarList from "@/components/cars/CarList";
import Snackbar from "@/components/common/Snackbar";
import { useSnackbar } from "@/lib/useSnackbar";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useCarsWithMinLoadTime } from "@/lib/hooks/useCars";

export default function RefuelsIndex() {
  const { t } = useTranslation();
  const router = useRouter();

  // Fetch cars with React Query (using min load time to avoid flickering)
  const { data: cars = [], isLoading, isError } = useCarsWithMinLoadTime();

  const { snackbar, hideSnackbar } = useSnackbar();

  const handleAddCar = () => {
    router.push("/cars/add");
  };

  const handleCarClick = (carId: string) => {
    router.push(`/cars/${carId}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 md:py-8">
      {/* Header */}
      <div className="mb-6 md:mb-8 flex justify-between items-start">
        <div>
          <h1 className="heading-1">{t.cars.title}</h1>
          <p className="text-secondary mt-2 text-sm md:text-base">
            {t.cars.description}
          </p>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="heading-2">{t.cars.myCars}</h2>
          <button
            onClick={handleAddCar}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={t.cars.addCar}
          >
            <AddIcon className="icon text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <CarList
          cars={cars}
          isLoading={isLoading}
          isError={isError}
          onCarClick={handleCarClick}
        />
      </div>

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
