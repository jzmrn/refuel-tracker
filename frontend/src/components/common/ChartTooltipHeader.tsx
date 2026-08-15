import React from "react";
import {
  useTranslation,
  useLocalization,
} from "../../lib/i18n/LanguageContext";

interface ChartTooltipHeaderProps {
  /**
   * Timestamps of all entries represented by the hovered data point. A single
   * timestamp renders the regular date/time header, multiple timestamps render
   * a "combined" header listing every date with its time.
   */
  timestamps: string[];
}

/**
 * Header of a chart tooltip.
 *
 * For combined data points (partial fills merged with the closing full fill)
 * all contained dates are listed so no information is lost.
 */
export default function ChartTooltipHeader({
  timestamps,
}: ChartTooltipHeaderProps) {
  const { t } = useTranslation();
  const { formatDate } = useLocalization();

  const dates = (timestamps ?? [])
    .filter(Boolean)
    .map((timestamp) => new Date(timestamp))
    .sort((a, b) => a.getTime() - b.getTime());

  if (dates.length === 0) return null;

  const formatTime = (date: Date) =>
    formatDate(date, { hour: "2-digit", minute: "2-digit" });

  if (dates.length === 1) {
    return (
      <div className="mb-2">
        <p className="text-primary font-medium">
          {formatDate(dates[0], {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
        <p className="text-sm text-secondary">{formatTime(dates[0])}</p>
      </div>
    );
  }

  return (
    <div className="mb-2 pb-2 border-b">
      <p className="text-primary font-medium mb-1">
        {t.refuels.combinedEntries}
      </p>
      <div className="space-y-1 text-sm">
        {dates.map((date) => (
          <p
            key={date.getTime()}
            className="flex justify-between gap-4 text-secondary"
          >
            <span className="text-gray-400">
              {formatDate(date, {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span className="font-semibold">{formatTime(date)}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

/**
 * Builds the x-axis label for a (possibly combined) data point. Combined points
 * are labelled with the range of the first and last contained date
 * (e.g. "Apr 12 – May 16, 25").
 */
export function formatChartDateLabel(
  timestamps: string[],
  formatDate: (date: Date, options?: Intl.DateTimeFormatOptions) => string,
): string {
  const dates = (timestamps ?? [])
    .filter(Boolean)
    .map((timestamp) => new Date(timestamp))
    .sort((a, b) => a.getTime() - b.getTime());

  if (dates.length === 0) return "";

  const last = formatDate(dates[dates.length - 1], {
    month: "short",
    day: "numeric",
    year: "2-digit",
  });

  if (dates.length === 1) return last;

  const first = formatDate(dates[0], { month: "short", day: "numeric" });
  return `${first} – ${last}`;
}
