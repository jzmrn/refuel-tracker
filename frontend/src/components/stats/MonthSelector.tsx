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
    return date.toLocaleDateString(locale, { month: "long", year: "numeric" });
  }

  const colsClass =
    months.length === 1
      ? "grid-cols-1"
      : months.length === 2
      ? "grid-cols-2"
      : "grid-cols-3";

  return (
    <div className={`grid ${colsClass} gap-2 ${className}`}>
      {months.map((m) => (
        <button
          key={m.date}
          onClick={() => onMonthChange(m.date)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedMonth === m.date
              ? "bg-primary-50 text-primary-700 dark:bg-blue-900/20 dark:text-blue-300"
              : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
          }`}
        >
          {formatMonthLabel(m.date)}
        </button>
      ))}
    </div>
  );
}
