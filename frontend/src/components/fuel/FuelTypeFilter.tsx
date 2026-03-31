import React from "react";
import { FuelType } from "@/lib/api";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { FilterPanel, FilterRow } from "@/components/common";
import FuelTypeSelector from "@/components/fuel/FuelTypeSelector";
import FilterAltIcon from "@mui/icons-material/FilterAlt";

interface FuelTypeFilterProps {
  selectedFuelType: FuelType;
  onFuelTypeChange: (fuelType: FuelType) => void;
  availableFuelTypes?: FuelType[];
  className?: string;
}

const FuelTypeFilter: React.FC<FuelTypeFilterProps> = ({
  selectedFuelType,
  onFuelTypeChange,
  availableFuelTypes,
  className,
}) => {
  const { t } = useTranslation();

  const fuelTypeLabels: Record<FuelType, string> = {
    e5: t.fuelPrices.e5,
    e10: t.fuelPrices.e10,
    diesel: t.fuelPrices.diesel,
  };

  const summary = [fuelTypeLabels[selectedFuelType]];

  return (
    <FilterPanel
      title={t.statistics.filters}
      icon={
        <FilterAltIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
      }
      collapsedSummary={summary}
      className={className}
      storageKey="fuel-type-filter"
    >
      <FilterRow label={t.statistics.selectFuelType}>
        <FuelTypeSelector
          selectedFuelType={selectedFuelType}
          onFuelTypeChange={onFuelTypeChange}
          availableFuelTypes={availableFuelTypes}
        />
      </FilterRow>
    </FilterPanel>
  );
};

export default FuelTypeFilter;
