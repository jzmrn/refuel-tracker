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
    <div className={`grid grid-cols-1 xs:grid-cols-2 gap-2 ${className}`}>
      {options.map((months) => (
        <button
          key={months}
          onClick={() => onMonthsChange(months)}
          className={
            selectedMonths === months
              ? "btn-toggle-active"
              : "btn-toggle-inactive"
          }
        >
          {labels[months]}
        </button>
      ))}
    </div>
  );
}
