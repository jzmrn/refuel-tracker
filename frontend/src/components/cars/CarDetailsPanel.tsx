import React from "react";
import EditIcon from "@mui/icons-material/Edit";
import CloseIcon from "@mui/icons-material/Close";
import Panel from "@/components/common/Panel";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { Car } from "@/lib/api";

interface CarDetailsPanelProps {
  car: Car;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}

const CarDetailsPanel: React.FC<CarDetailsPanelProps> = ({
  car,
  onEdit,
  onDelete,
  isDeleting = false,
}) => {
  const { t } = useTranslation();

  return (
    <Panel
      title={car.name}
      actions={
        <div className="flex gap-1">
          <button
            onClick={onEdit}
            disabled={!car.is_owner}
            className={`p-2 rounded-lg transition-colors ${
              car.is_owner
                ? "hover:bg-gray-100 dark:hover:bg-gray-700"
                : "opacity-50 cursor-not-allowed"
            }`}
            aria-label={t.cars.editCar}
          >
            <EditIcon className="icon text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={onDelete}
            disabled={!car.is_owner || isDeleting}
            className={`p-2 rounded-lg transition-colors ${
              car.is_owner
                ? "hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                : "opacity-50 cursor-not-allowed"
            }`}
            aria-label={t.cars.deleteCar}
          >
            <CloseIcon className="icon text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 xxs:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <span className="text-sm text-secondary">{t.cars.year}</span>
          <p className="font-medium text-gray-900 dark:text-white">
            {car.year}
          </p>
        </div>
        <div>
          <span className="text-sm text-secondary">{t.cars.fuelTankSize}</span>
          <p className="font-medium text-gray-900 dark:text-white">
            {car.fuel_tank_size} L
          </p>
        </div>
        <div>
          <span className="text-sm text-secondary">{t.cars.fuelType}</span>
          <p className="font-medium text-gray-900 dark:text-white">
            {car.fuel_type === "e5"
              ? t.fuelPrices.e5
              : car.fuel_type === "e10"
              ? t.fuelPrices.e10
              : car.fuel_type === "diesel"
              ? t.fuelPrices.diesel
              : car.fuel_type || "-"}
          </p>
        </div>
        <div>
          <span className="text-sm text-secondary">{t.cars.owner}</span>
          <p className="font-medium text-gray-900 dark:text-white">
            {car.owner_name}
          </p>
        </div>
      </div>
    </Panel>
  );
};

export default CarDetailsPanel;
