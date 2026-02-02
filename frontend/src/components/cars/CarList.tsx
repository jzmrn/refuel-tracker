import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import CloseIcon from "@mui/icons-material/Close";
import { EmptyPanel, LoadingSpinner } from "@/components/common";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import CarCard from "./CarCard";
import { Car } from "@/lib/api";

interface CarListProps {
  cars: Car[];
  isLoading: boolean;
  isError: boolean;
  onCarClick: (carId: string) => void;
}

export default function CarList({
  cars,
  isLoading,
  isError,
  onCarClick,
}: CarListProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (isError) {
    return (
      <EmptyPanel
        icon={
          <CloseIcon className="icon-xl text-gray-400 dark:text-gray-500 mb-3" />
        }
        title={t.common.errorLoadingData}
      />
    );
  }

  if (cars.length === 0) {
    return (
      <EmptyPanel
        icon={
          <DirectionsCarIcon className="icon-xl text-gray-400 dark:text-gray-500 mb-3" />
        }
        title={t.cars.addFirstCar}
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {cars.map((car) => (
        <CarCard key={car.id} car={car} onClick={() => onCarClick(car.id)} />
      ))}
    </div>
  );
}
