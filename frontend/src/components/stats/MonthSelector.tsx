import { useTranslation } from "@/lib/i18n/LanguageContext";
import { getLocale } from "@/lib/i18n/utils";
import { AvailableMonth } from "@/lib/api";

interface MonthSelectorProps {
  selectedMonth: string | null;
  onMonthChange: (month: string) => void;
  availableMonths: AvailableMonth[];
  className?: string;
}

export default function MonthSelector({
  selectedMonth,
  onMonthChange,
  availableMonths,
  className = "",
}: MonthSelectorProps) {
  const { language } = useTranslation();
  const locale = getLocale(language);

  // Show the latest 3 months, oldest first (latest on the right)
  const months = availableMonths.slice(0, 3).reverse();

  function formatMonthLabel(dateStr: string): string {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString(locale, { month: "long" });
  }

  const colsClass =
    months.length === 1
      ? "xs:grid-cols-1"
      : months.length === 2
      ? "xs:grid-cols-2"
      : "xs:grid-cols-3";

  return (
    <div className={`grid grid-cols-1 ${colsClass} gap-2 ${className}`}>
      {months.map((m) => (
        <button
          key={m.date}
          onClick={() => onMonthChange(m.date)}
          className={
            selectedMonth === m.date
              ? "btn-toggle-active"
              : "btn-toggle-inactive"
          }
        >
          {formatMonthLabel(m.date)}
        </button>
      ))}
    </div>
  );
}
