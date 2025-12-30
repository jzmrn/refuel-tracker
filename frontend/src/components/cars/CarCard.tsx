import React from "react";
import { Car } from "@/lib/api";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import LocalGasStationIcon from "@mui/icons-material/LocalGasStation";
import PeopleIcon from "@mui/icons-material/People";

interface CarCardProps {
  car: Car;
  onClick: () => void;
}

const CarCard: React.FC<CarCardProps> = ({ car, onClick }) => {
  const { t } = useTranslation();

  return (
    <button
      onClick={onClick}
      className="panel hover:shadow-lg transition-all duration-200 text-left w-full group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary-50 dark:bg-blue-900/20 flex items-center justify-center">
            <DirectionsCarIcon className="icon text-primary-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="heading-3 truncate">{car.name}</h3>
            <div className="flex items-center gap-4 mt-1.5">
              <div className="flex items-center gap-1">
                <CalendarMonthIcon
                  className="text-gray-400 dark:text-gray-500"
                  sx={{ fontSize: 16 }}
                />
                <span className="text-xs text-secondary">{car.year}</span>
              </div>
              {car.fuel_tank_size && (
                <div className="flex items-center gap-1">
                  <LocalGasStationIcon
                    className="text-gray-400 dark:text-gray-500"
                    sx={{ fontSize: 16 }}
                  />
                  <span className="text-xs text-secondary">
                    {car.fuel_tank_size}L
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <PeopleIcon
                  className="text-gray-400 dark:text-gray-500"
                  sx={{ fontSize: 16 }}
                />
                <span className="text-xs text-secondary">
                  {car.shared_users?.length || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
        <ChevronRightIcon className="icon text-gray-400 dark:text-gray-500 flex-shrink-0 group-hover:text-primary-600 dark:group-hover:text-blue-400 transition-colors" />
      </div>
    </button>
  );
};

export default CarCard;
