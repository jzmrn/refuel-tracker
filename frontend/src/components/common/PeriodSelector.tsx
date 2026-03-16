import { useTranslation } from "@/lib/i18n/LanguageContext";

interface PeriodOption<T extends string> {
  value: T;
  label: string;
}

interface PeriodSelectorProps<T extends string> {
  selectedPeriod: T;
  onPeriodChange: (period: T) => void;
  options: PeriodOption<T>[];
  className?: string;
}

export default function PeriodSelector<T extends string>({
  selectedPeriod,
  onPeriodChange,
  options,
  className = "",
}: PeriodSelectorProps<T>) {
  return (
    <div className={`grid grid-cols-1 xs:grid-cols-2 gap-2 ${className}`}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onPeriodChange(option.value)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedPeriod === option.value
              ? "bg-primary-50 text-primary-700 dark:bg-blue-900/20 dark:text-blue-300"
              : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
