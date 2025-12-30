import React from "react";
import { RefuelMetric } from "../../lib/api";
import LoadingSpinner from "../common/LoadingSpinner";
import { useTranslation } from "../../lib/i18n/LanguageContext";
import { EmptyState } from "../common";
import CollectionsIcon from "@mui/icons-material/Collections";

interface RefuelListProps {
  refuels: RefuelMetric[];
  loading?: boolean;
}

export default function RefuelList({ refuels, loading }: RefuelListProps) {
  const { t } = useTranslation();
  if (loading) {
    return <LoadingSpinner text={t.refuels.loadingData} />;
  }

  if (!refuels || refuels.length === 0) {
    return (
      <EmptyState
        icon={
          <CollectionsIcon className="icon-xl text-gray-600 dark:text-gray-400 mx-auto mb-4" />
        }
        title={t.refuels.noRefuelEntriesYet}
      />
    );
  }

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return (
        date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }) + ` (${t.refuels.today})`
      );
    }

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const formatLiters = (liters: number) => {
    return `${liters.toFixed(2)} L`;
  };

  const formatPricePerLiter = (price: number) => {
    return `${price.toFixed(3)} €/L`;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-1 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
              {t.refuels.dateHeader}
            </th>
            <th className="px-1 sm:px-2 lg:px-4 py-2 sm:py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
              €/L
            </th>
            <th className="px-1 sm:px-2 lg:px-4 py-2 sm:py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
              {t.refuels.litersHeader}
            </th>
            <th className="px-1 sm:px-2 lg:px-4 py-2 sm:py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
              {t.refuels.totalHeader}
            </th>
            <th className="px-1 sm:px-2 lg:px-4 py-2 sm:py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider hidden md:table-cell">
              {t.refuels.kmHeader}
            </th>
            <th className="px-1 sm:px-2 lg:px-4 py-2 sm:py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
              L/100km
            </th>
            <th className="px-1 sm:px-2 lg:px-4 py-2 sm:py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider hidden lg:table-cell">
              {t.refuels.notesHeader}
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {refuels?.map((refuel, index) => {
            const totalCost = refuel.price * refuel.amount;
            const refuelDate = new Date(refuel.timestamp);
            const now = new Date();
            const isToday = refuelDate.toDateString() === now.toDateString();

            return (
              <tr
                key={index}
                className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  isToday ? "bg-blue-50/30 dark:bg-blue-900/20" : ""
                }`}
              >
                <td className="px-1 sm:px-3 lg:px-6 py-2 sm:py-3 lg:py-4 text-xs sm:text-sm text-primary">
                  <div className="font-medium">
                    <div className="sm:hidden">
                      {new Date(refuel.timestamp).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                    <div className="hidden sm:block">
                      {formatDate(refuel.timestamp)}
                    </div>
                  </div>
                </td>
                <td className="px-1 sm:px-2 lg:px-4 py-2 sm:py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-primary font-medium">
                  {formatPricePerLiter(refuel.price)}
                </td>
                <td className="px-1 sm:px-2 lg:px-4 py-2 sm:py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-primary font-medium">
                  {formatLiters(refuel.amount)}
                </td>
                <td className="px-1 sm:px-2 lg:px-4 py-2 sm:py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm font-bold text-primary">
                  {formatCurrency(totalCost)}
                </td>
                <td className="px-1 sm:px-2 lg:px-4 py-2 sm:py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-primary hidden md:table-cell">
                  {refuel.kilometers_since_last_refuel.toFixed(0)}
                </td>
                <td className="px-1 sm:px-2 lg:px-4 py-2 sm:py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-primary">
                  <div className="font-medium">
                    {(
                      (refuel.amount / refuel.kilometers_since_last_refuel) *
                      100
                    ).toFixed(1)}
                  </div>
                  <div className="text-xs text-secondary md:hidden">
                    {refuel.kilometers_since_last_refuel.toFixed(0)}km
                  </div>
                </td>
                <td className="px-1 sm:px-2 lg:px-4 py-2 sm:py-3 lg:py-4 text-xs sm:text-sm text-secondary max-w-xs truncate hidden lg:table-cell">
                  {refuel.notes || "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
