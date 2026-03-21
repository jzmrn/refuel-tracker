import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import { EmptyPanel } from "@/components/common";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import CarCard from "./CarCard";
import { Car } from "@/lib/api";

interface CarListProps {
  cars: Car[];
  onCarClick: (carId: string) => void;
}

export default function CarList({ cars, onCarClick }: CarListProps) {
  const { t } = useTranslation();

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
