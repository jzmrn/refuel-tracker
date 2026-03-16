import React from "react";
import { FuelType } from "@/lib/api";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { FilterPanel, FilterRow } from "@/components/common";
import FuelTypeSelector from "@/components/fuel/FuelTypeSelector";
import TimeRangeSelector from "@/components/stats/TimeRangeSelector";
import FilterAltIcon from "@mui/icons-material/FilterAlt";

interface TimeRangeFuelTypeFilterProps {
  selectedFuelType: FuelType;
  onFuelTypeChange: (fuelType: FuelType) => void;
  selectedMonths: number;
  onMonthsChange: (months: number) => void;
  className?: string;
}

const timeRangeLabels: Record<number, string> = {
  3: "3M",
  12: "12M",
};

const TimeRangeFuelTypeFilter: React.FC<TimeRangeFuelTypeFilterProps> = ({
  selectedFuelType,
  onFuelTypeChange,
  selectedMonths,
  onMonthsChange,
  className,
}) => {
  const { t } = useTranslation();

  const fuelTypeLabels: Record<FuelType, string> = {
    e5: t.fuelPrices.e5Short,
    e10: t.fuelPrices.e10Short,
    diesel: t.fuelPrices.diesel,
  };

  const summary = [
    timeRangeLabels[selectedMonths] ?? `${selectedMonths}M`,
    fuelTypeLabels[selectedFuelType],
  ];

  return (
    <FilterPanel
      title={t.statistics.filters}
      icon={
        <FilterAltIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
      }
      collapsedSummary={summary}
      className={className}
    >
      <FilterRow label={t.statistics.timeRange}>
        <TimeRangeSelector
          selectedMonths={selectedMonths}
          onMonthsChange={onMonthsChange}
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

export default TimeRangeFuelTypeFilter;
