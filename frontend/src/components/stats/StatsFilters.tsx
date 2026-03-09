import React from "react";
import { FuelType, AvailableMonth } from "@/lib/api";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { StandardCard } from "@/components/common";
import FuelTypeSelector from "@/components/fuel/FuelTypeSelector";
import MonthSelector from "@/components/stats/MonthSelector";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import OilBarrel from "@mui/icons-material/OilBarrel";

interface StatsFiltersProps {
  selectedMonth: string | null;
  onMonthChange: (month: string) => void;
  availableMonths: AvailableMonth[];
  selectedFuelType: FuelType;
  onFuelTypeChange: (fuelType: FuelType) => void;
}

const StatsFilters: React.FC<StatsFiltersProps> = ({
  selectedMonth,
  onMonthChange,
  availableMonths,
  selectedFuelType,
  onFuelTypeChange,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <StandardCard
        title={t.statistics.selectMonth}
        icon={
          <CalendarMonthIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        }
        iconBackground="blue"
      >
        <MonthSelector
          selectedMonth={selectedMonth}
          onMonthChange={onMonthChange}
          availableMonths={availableMonths}
        />
      </StandardCard>

      <StandardCard
        title={t.statistics.selectFuelType}
        icon={
          <OilBarrel className="w-5 h-5 text-green-600 dark:text-green-400" />
        }
        iconBackground="green"
      >
        <FuelTypeSelector
          selectedFuelType={selectedFuelType}
          onFuelTypeChange={onFuelTypeChange}
        />
      </StandardCard>
    </>
  );
};

export default StatsFilters;
