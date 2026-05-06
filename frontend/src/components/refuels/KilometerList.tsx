import React from "react";
import { KilometerEntry } from "../../lib/api";
import LoadingSpinner from "../common/LoadingSpinner";
import {
  useTranslation,
  useLocalization,
} from "../../lib/i18n/LanguageContext";

interface KilometerListProps {
  entries: KilometerEntry[];
  loading?: boolean;
}

export default function KilometerList({
  entries,
  loading,
}: KilometerListProps) {
  const { t } = useTranslation();
  const { formatDate: formatDateLocalized } = useLocalization();

  if (loading) {
    return <LoadingSpinner text={t.common.loading} />;
  }

  if (!entries || entries.length === 0) {
    return (
      <p className="text-secondary text-sm">{t.kilometers.noEntriesYet}</p>
    );
  }

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return (
        formatDateLocalized(date, {
          hour: "2-digit",
          minute: "2-digit",
        }) + ` (${t.refuels.today})`
      );
    }

    return formatDateLocalized(date, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatKilometers = (km: number) => {
    return new Intl.NumberFormat("de-DE").format(Math.round(km)) + " km";
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-1 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
              {t.refuels.dateHeader}
            </th>
            <th className="px-1 sm:px-2 lg:px-4 py-2 sm:py-3 text-right text-xs font-medium text-secondary uppercase tracking-wider">
              {t.kilometers.totalKilometers}
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {entries.map((entry, index) => {
            const entryDate = new Date(entry.timestamp);
            const now = new Date();
            const isToday = entryDate.toDateString() === now.toDateString();

            return (
              <tr
                key={entry.id}
                className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  isToday ? "bg-blue-50/30 dark:bg-blue-900/20" : ""
                }`}
              >
                <td className="px-1 sm:px-3 lg:px-6 py-2 sm:py-3 lg:py-4 text-xs sm:text-sm text-primary">
                  <div className="font-medium">
                    <div className="sm:hidden">
                      {formatDateLocalized(new Date(entry.timestamp), {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                    <div className="hidden sm:block">
                      {formatDate(entry.timestamp)}
                    </div>
                  </div>
                </td>
                <td className="px-1 sm:px-2 lg:px-4 py-2 sm:py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-primary font-medium text-right">
                  {formatKilometers(entry.total_kilometers)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
