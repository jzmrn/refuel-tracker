import AddIcon from "@mui/icons-material/Add";
import CarCard from "@/components/cars/CarCard";
import Snackbar from "@/components/common/Snackbar";
import PageTransition from "@/components/common/PageTransition";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import Panel from "@/components/common/Panel";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import { useSnackbar } from "@/lib/useSnackbar";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { usePathAnimation } from "@/lib/hooks/usePathAnimation";
import { useCarsWithMinLoadTime } from "@/lib/hooks/useCars";

export default function RefuelsIndex() {
  const { t } = useTranslation();

  // Use smart path-based animations
  const { isVisible, animationDirection, navigateWithAnimation } =
    usePathAnimation({ currentPath: "/refuels" });

  // Fetch cars with React Query (using min load time to avoid flickering)
  const { data: cars = [], isLoading } = useCarsWithMinLoadTime();

  // Separate owned cars from shared cars
  const ownedCars = cars.filter((car) => car.is_owner);
  const sharedCars = cars.filter((car) => !car.is_owner);

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

      {isLoading ? (
        <Panel>
          <LoadingSpinner text={t.common.loading} />
        </Panel>
      ) : (
        <div className="space-y-8">
          {/* My Cars Section */}
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
            {ownedCars.length === 0 ? (
              <Panel>
                <div className="flex flex-col items-center justify-center py-12">
                  <DirectionsCarIcon className="icon-xl text-gray-400 dark:text-gray-500 mb-3" />
                  <p className="text-secondary text-center">
                    {t.cars.addFirstCar}
                  </p>
                </div>
              </Panel>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {ownedCars.map((car) => (
                  <CarCard
                    key={car.id}
                    car={car}
                    onClick={() => handleCarClick(car.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Cars Shared With Me Section */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="heading-2">{t.cars.sharedWithMe}</h2>
            </div>
            {sharedCars.length === 0 ? (
              <Panel>
                <div className="flex flex-col items-center justify-center py-12">
                  <DirectionsCarIcon className="icon-xl text-gray-400 dark:text-gray-500 mb-3" />
                  <p className="text-secondary text-center">
                    {t.cars.noCarsSharedWithYou}
                  </p>
                </div>
              </Panel>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {sharedCars.map((car) => (
                  <CarCard
                    key={car.id}
                    car={car}
                    onClick={() => handleCarClick(car.id)}
                  />
                ))}
              </div>
            )}
          </div>
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
