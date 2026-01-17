import React from "react";
import { Car } from "@/lib/api";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import LocalGasStationIcon from "@mui/icons-material/LocalGasStation";
import OpacityIcon from "@mui/icons-material/Opacity";
import PeopleIcon from "@mui/icons-material/People";
import ReceiptIcon from "@mui/icons-material/Receipt";

interface CarCardProps {
  car: Car;
  onClick: () => void;
}

const CarCard: React.FC<CarCardProps> = ({ car, onClick }) => {
  const { t } = useTranslation();

  return (
    <button
      onClick={onClick}
      className="panel text-left w-full hover:shadow-lg transition-all duration-200 cursor-pointer"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="heading-3 truncate">{car.name}</h3>
              {car.is_owner ? (
                <span className="shrink-0 px-2 py-0.5 text-xs font-medium text-white bg-green-500 rounded-full">
                  {t.cars.owner}
                </span>
              ) : car.shared_by ? (
                <span className="shrink-0 px-2 py-0.5 text-xs font-medium text-white bg-blue-500 rounded-full">
                  {car.shared_by}
                </span>
              ) : null}
            </div>
            <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-1.5">
              <div className="flex items-center gap-1 shrink-0">
                <CalendarMonthIcon
                  className="text-gray-400 dark:text-gray-500"
                  sx={{ fontSize: 16 }}
                />
                <span className="text-xs text-secondary">{car.year}</span>
              </div>
              {car.fuel_tank_size && (
                <div className="flex items-center gap-1 shrink-0">
                  <LocalGasStationIcon
                    className="text-gray-400 dark:text-gray-500"
                    sx={{ fontSize: 16 }}
                  />
                  <span className="text-xs text-secondary">
                    {car.fuel_tank_size}L
                  </span>
                </div>
              )}
              {car.fuel_type && (
                <div className="flex items-center gap-1 shrink-0">
                  <OpacityIcon
                    className="text-gray-400 dark:text-gray-500"
                    sx={{ fontSize: 16 }}
                  />
                  <span className="text-xs text-secondary">
                    {car.fuel_type === "e5"
                      ? t.fuelPrices.e5
                      : car.fuel_type === "e10"
                      ? t.fuelPrices.e10
                      : car.fuel_type === "diesel"
                      ? t.fuelPrices.diesel
                      : car.fuel_type}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1 shrink-0">
                <ReceiptIcon
                  className="text-gray-400 dark:text-gray-500"
                  sx={{ fontSize: 16 }}
                />
                <span className="text-xs text-secondary">
                  {car.refuel_count ?? 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
};

export default CarCard;
