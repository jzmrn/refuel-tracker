import React from "react";
import { useLocalization, useTranslation } from "@/lib/i18n/LanguageContext";

interface ResponsiveDateProps {
  date: Date;
  showTodayIndicator?: boolean;
}

export default function ResponsiveDate({
  date,
  showTodayIndicator = true,
}: ResponsiveDateProps) {
  const { formatDate: formatDateLocalized } = useLocalization();
  const { t } = useTranslation();

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const todaySuffix =
    showTodayIndicator && isToday ? ` (${t.refuels.today})` : "";

  return (
    <>
      {/* XS: day + month on top, year below */}
      <div className="font-medium sm:hidden">
        <div>
          {formatDateLocalized(date, {
            day: "numeric",
            month: "short",
          })}
          {todaySuffix}
        </div>
        <div className="text-secondary text-xs">
          {formatDateLocalized(date, {
            year: "numeric",
          })}
        </div>
      </div>
      {/* SM: day, month, year (no weekday, no time) */}
      <div className="font-medium whitespace-nowrap hidden sm:block md:hidden">
        {formatDateLocalized(date, {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
        {todaySuffix}
      </div>
      {/* MD: day, month, year + time (no weekday) */}
      <div className="font-medium whitespace-nowrap hidden md:block lg:hidden">
        {formatDateLocalized(date, {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
        {todaySuffix}
      </div>
      {/* LG+: full date with weekday and time */}
      <div className="font-medium whitespace-nowrap hidden lg:block">
        {formatDateLocalized(date, {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
        {todaySuffix}
      </div>
    </>
  );
}
