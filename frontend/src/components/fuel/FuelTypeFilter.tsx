import React from "react";
import { FuelType } from "@/lib/api";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { FilterPanel, FilterRow } from "@/components/common";
import FuelTypeSelector from "@/components/fuel/FuelTypeSelector";
import { getFuelTypeLabel } from "@/lib/fuelType";

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

  const summary = [getFuelTypeLabel(selectedFuelType, t)];

  return (
    <FilterPanel
      title={t.statistics.filters}
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
