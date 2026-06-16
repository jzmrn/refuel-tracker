import React from "react";
import { FuelType, AvailableMonth } from "@/lib/api";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useLocalization } from "@/lib/i18n/LanguageContext";
import { FilterPanel, FilterRow } from "@/components/common";
import FuelTypeSelector from "@/components/fuel/FuelTypeSelector";
import MonthSelector from "@/components/stats/MonthSelector";
import { getFuelTypeLabel } from "@/lib/fuelType";

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

  const summary = [
    selectedMonth
      ? formatDate(new Date(selectedMonth + "T00:00:00"), {
          month: "long",
        })
      : "",
    getFuelTypeLabel(selectedFuelType, t),
  ].filter(Boolean);

  return (
    <FilterPanel
      title={t.statistics.filters}
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
