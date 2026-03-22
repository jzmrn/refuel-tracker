import React from "react";
import { FuelType, AvailableMonth } from "@/lib/api";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useLocalization } from "@/lib/i18n/LanguageContext";
import { FilterPanel, FilterRow } from "@/components/common";
import FuelTypeSelector from "@/components/fuel/FuelTypeSelector";
import MonthSelector from "@/components/stats/MonthSelector";
import FilterAltIcon from "@mui/icons-material/FilterAlt";

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
  const { formatDate } = useLocalization();

  const fuelTypeLabels: Record<FuelType, string> = {
    e5: t.fuelPrices.e5Short,
    e10: t.fuelPrices.e10Short,
    diesel: t.fuelPrices.diesel,
  };

  const summary = [
    selectedMonth
      ? formatDate(new Date(selectedMonth + "T00:00:00"), {
          month: "long",
        })
      : "",
    fuelTypeLabels[selectedFuelType],
  ].filter(Boolean);

  return (
    <FilterPanel
      title={t.statistics.filters}
      icon={
        <FilterAltIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
      }
      collapsedSummary={summary}
      storageKey="stats-filters"
    >
      <FilterRow label={t.statistics.month}>
        <MonthSelector
          selectedMonth={selectedMonth}
          onMonthChange={onMonthChange}
          availableMonths={availableMonths}
        />
      </FilterRow>
      <FilterRow label={t.statistics.selectFuelType}>
        <FuelTypeSelector
          selectedFuelType={selectedFuelType}
          onFuelTypeChange={onFuelTypeChange}
        />
      </FilterRow>
    </FilterPanel>
  );
};

export default StatsFilters;
