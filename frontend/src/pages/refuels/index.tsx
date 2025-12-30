import { useRouter } from "next/router";
import AddIcon from "@mui/icons-material/Add";
import CarCard from "@/components/cars/CarCard";
import Snackbar from "@/components/common/Snackbar";
import PageTransition from "@/components/common/PageTransition";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import { useSnackbar } from "@/lib/useSnackbar";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { usePathAnimation } from "@/lib/hooks/usePathAnimation";
import { useCarsWithMinLoadTime } from "@/lib/hooks/useCars";

export default function RefuelsIndex() {
  const { t } = useTranslation();
  const router = useRouter();

  // Use smart path-based animations
  const { isVisible, animationDirection, navigateWithAnimation } =
    usePathAnimation({ currentPath: "/refuels" });

  // Fetch cars with React Query (using min load time to avoid flickering)
  const { data: cars = [], isLoading } = useCarsWithMinLoadTime();

  const { snackbar, hideSnackbar } = useSnackbar();

  const handleAddCar = () => {
    navigateWithAnimation("/refuels/car");
  };

  const handleCarClick = (carId: string) => {
    navigateWithAnimation(`/refuels/car/${carId}`);
  };

  return (
    <PageTransition
      isVisible={isVisible}
      animationDirection={animationDirection}
      className="max-w-7xl mx-auto px-4 py-4 md:py-8"
    >
      {/* Header */}
      <div className="mb-6 md:mb-8 flex justify-between items-start">
        <div>
          <h1 className="heading-1">{t.refuels.refuelTracking}</h1>
          <p className="text-secondary mt-2 text-sm md:text-base">
            {t.refuels.manageFuelData}
          </p>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="heading-2">
          {t.cars.myCars} ({cars.length})
        </h2>
        <button
          onClick={handleAddCar}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label={t.cars.addCar}
        >
          <AddIcon className="icon text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Cars List */}
      {isLoading ? (
        <div className="panel">
          <LoadingSpinner text={t.common.loading} />
        </div>
      ) : cars.length === 0 ? (
        <EmptyState
          icon={
            <DirectionsCarIcon className="icon-xl text-gray-600 dark:text-gray-400 mx-auto mb-4" />
          }
          title={t.cars.noCarsYet}
          subtitle={t.cars.addFirstCar}
        />
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
