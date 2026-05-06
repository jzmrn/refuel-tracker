import React from "react";
import { useTranslation } from "@/lib/i18n/LanguageContext";

interface YearSelectorProps {
  selectedYear: number | null;
  onYearChange: (year: number | null) => void;
  availableYears: number[];
  className?: string;
}

/**
 * A year selector component that shows only available years as toggle buttons.
 * Falls back to "All" when no specific year is selected.
 */
export const YearSelector: React.FC<YearSelectorProps> = ({
  selectedYear,
  onYearChange,
  availableYears,
  className = "",
}) => {
  const { t } = useTranslation();

  if (availableYears.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {/* All option */}
      <button
        type="button"
        onClick={() => onYearChange(null)}
        className={
          selectedYear === null ? "btn-toggle-active" : "btn-toggle-inactive"
        }
      >
        {t.common.all}
      </button>

      {/* Year buttons - sorted descending (most recent first) */}
      {[...availableYears]
        .sort((a, b) => b - a)
        .map((year) => (
          <button
            key={year}
            type="button"
            onClick={() => onYearChange(year)}
            className={
              selectedYear === year
                ? "btn-toggle-active"
                : "btn-toggle-inactive"
            }
          >
            {year}
          </button>
        ))}
    </div>
  );
};

export default YearSelector;
