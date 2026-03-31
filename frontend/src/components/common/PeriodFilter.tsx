import React from "react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { FilterPanel, FilterRow } from "@/components/common";
import PeriodSelector from "@/components/common/PeriodSelector";
import FilterAltIcon from "@mui/icons-material/FilterAlt";

interface PeriodOption<T extends string> {
  value: T;
  label: string;
  shortLabel?: string;
}

interface PeriodFilterProps<T extends string> {
  selectedPeriod: T;
  onPeriodChange: (period: T) => void;
  options: PeriodOption<T>[];
  className?: string;
}

export default function PeriodFilter<T extends string>({
  selectedPeriod,
  onPeriodChange,
  options,
  className,
}: PeriodFilterProps<T>) {
  const { t } = useTranslation();

  const selectedOption = options.find((o) => o.value === selectedPeriod);
  const summary = [selectedOption?.shortLabel ?? selectedOption?.label ?? "-"];

  return (
    <FilterPanel
      title={t.statistics.filters}
      icon={
        <FilterAltIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
      }
      collapsedSummary={summary}
      className={className}
      storageKey="period-filter"
    >
      <FilterRow label={t.statistics.timeRange}>
        <PeriodSelector
          selectedPeriod={selectedPeriod}
          onPeriodChange={onPeriodChange}
          options={options}
        />
      </FilterRow>
    </FilterPanel>
  );
}
