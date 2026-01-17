import { useRouter } from "next/router";
import AddIcon from "@mui/icons-material/Add";
import CircularProgress from "@mui/material/CircularProgress";
import CarCard from "@/components/cars/CarCard";
import Snackbar from "@/components/common/Snackbar";
import Panel from "@/components/common/Panel";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import { useSnackbar } from "@/lib/useSnackbar";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useCarsWithMinLoadTime } from "@/lib/hooks/useCars";

export default function RefuelsIndex() {
  const { t } = useTranslation();
  const router = useRouter();

  // Fetch cars with React Query (using min load time to avoid flickering)
  const { data: cars = [], isLoading } = useCarsWithMinLoadTime();

  const { snackbar, hideSnackbar } = useSnackbar();

  const handleAddCar = () => {
    router.push("/refuels/car");
  };

  const handleCarClick = (carId: string) => {
    router.push(`/refuels/car/${carId}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 md:py-8">
      {/* Header */}
      <div className="mb-6 md:mb-8 flex justify-between items-start">
        <div>
          <h1 className="heading-1">{t.refuels.refuelTracking}</h1>
          <p className="text-secondary mt-2 text-sm md:text-base">
            {t.refuels.manageFuelData}
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
        {isLoading ? (
          <div className="flex items-center justify-center gap-3 py-12">
            <CircularProgress size={24} />
            <span className="text-secondary">{t.common.loading}</span>
          </div>
        ) : cars.length === 0 ? (
          <Panel>
            <div className="flex flex-col items-center justify-center py-12">
              <DirectionsCarIcon className="icon-xl text-gray-400 dark:text-gray-500 mb-3" />
              <p className="text-secondary text-center">{t.cars.addFirstCar}</p>
            </div>
          </Panel>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {cars.map((car) => (
              <CarCard
                key={car.id}
                car={car}
                onClick={() => handleCarClick(car.id)}
              />
            ))}
          </div>
        )}
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
