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
          className={
            selectedPeriod === option.value
              ? "btn-toggle-active"
              : "btn-toggle-inactive"
          }
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
