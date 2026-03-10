import { useTranslation } from "@/lib/i18n/LanguageContext";

interface TimeRangeSelectorProps {
  selectedMonths: number;
  onMonthsChange: (months: number) => void;
  className?: string;
}

const options = [3, 12] as const;

export default function TimeRangeSelector({
  selectedMonths,
  onMonthsChange,
  className = "",
}: TimeRangeSelectorProps) {
  const { t } = useTranslation();

  const labels: Record<number, string> = {
    3: t.statistics.last3Months,
    12: t.statistics.lastYear,
  };

  return (
    <div className={`grid grid-cols-2 gap-2 ${className}`}>
      {options.map((months) => (
        <button
          key={months}
          onClick={() => onMonthsChange(months)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedMonths === months
              ? "bg-primary-50 text-primary-700 dark:bg-blue-900/20 dark:text-blue-300"
              : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
          }`}
        >
          {labels[months]}
        </button>
      ))}
    </div>
  );
}
