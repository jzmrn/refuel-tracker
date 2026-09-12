import React from "react";
import { RefuelMetric } from "../../lib/api";
import LoadingSpinner from "../common/LoadingSpinner";
import ResponsiveDate from "../common/ResponsiveDate";
import { useTranslation } from "../../lib/i18n/LanguageContext";
import { renderSvgFuelPrice } from "../../lib/formatPrice";
import { combineRefuelEntries } from "../../lib/refuelCombination";

interface RefuelListProps {
  refuels: RefuelMetric[];
  loading?: boolean;
  onRowClick?: (refuel: RefuelMetric) => void;
  hideEmptyState?: boolean;
}

export default function RefuelList({
  refuels,
  loading,
  onRowClick,
  hideEmptyState = false,
}: RefuelListProps) {
  const { t } = useTranslation();

  if (loading) {
    return <LoadingSpinner text={t.common.loading} />;
  }

  if (!refuels || refuels.length === 0) {
    if (hideEmptyState) return null;
    return (
      <p className="text-secondary text-sm">{t.refuels.noRefuelEntriesYet}</p>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const formatLiters = (liters: number) => {
    return `${liters.toFixed(2)} L`;
  };

  const isClickable = !!onRowClick;

  // ponytail: previous fill must be in this list; last-5/paged windows can miss it
  const estimatedTimestamps = new Set(
    combineRefuelEntries(refuels)
      .filter((g) => g.isCombined)
      .flatMap((g) => g.entries.map((e) => e.timestamp)),
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-1 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
              {t.refuels.dateHeader}
            </th>
            <th className="px-1 sm:px-2 lg:px-4 py-2 sm:py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider hidden lg:table-cell">
              {t.refuels.station}
            </th>
            <th className="px-1 sm:px-2 lg:px-4 py-2 sm:py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider hidden md:table-cell">
              {t.refuels.kmHeader}
            </th>
            <th className="px-1 sm:px-2 lg:px-4 py-2 sm:py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider hidden sm:table-cell">
              L/100km
            </th>
            <th className="px-1 sm:px-2 lg:px-4 py-2 sm:py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
              €/L
            </th>
            <th className="px-1 sm:px-2 lg:px-4 py-2 sm:py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
              {t.refuels.litersHeader}
            </th>
            <th className="px-1 sm:px-2 lg:px-4 py-2 sm:py-3 text-right text-xs font-medium text-secondary uppercase tracking-wider">
              {t.refuels.totalHeader}
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {refuels?.map((refuel) => {
            const totalCost = refuel.price * refuel.amount;
            const refuelDate = new Date(refuel.timestamp);
            const now = new Date();
            const isToday = refuelDate.toDateString() === now.toDateString();
            const isPartial = refuel.is_full_tank === false;
            const useEstimated =
              isPartial || estimatedTimestamps.has(refuel.timestamp);

            return (
              <tr
                key={refuel.timestamp}
                onClick={isClickable ? () => onRowClick(refuel) : undefined}
                className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  isToday ? "bg-blue-50/30 dark:bg-blue-900/20" : ""
                } ${isClickable ? "cursor-pointer" : ""}`}
              >
                <td className="px-1 sm:px-3 lg:px-6 py-2 sm:py-3 lg:py-4 text-xs sm:text-sm text-primary">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                        isPartial
                          ? "bg-amber-400 dark:bg-amber-500"
                          : "bg-blue-500 dark:bg-blue-400"
                      }`}
                      title={
                        isPartial ? t.refuels.partialFill : t.refuels.fullTank
                      }
                    />
                    <ResponsiveDate date={new Date(refuel.timestamp)} />
                  </div>
                </td>
                <td className="px-1 sm:px-2 lg:px-4 py-2 sm:py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-secondary hidden lg:table-cell">
                  {refuel.station_brand || "—"}
                </td>
                <td className="px-1 sm:px-2 lg:px-4 py-2 sm:py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-primary hidden md:table-cell">
                  {refuel.kilometers_since_last_refuel.toFixed(0)}
                </td>
                <td className="px-1 sm:px-2 lg:px-4 py-2 sm:py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm hidden sm:table-cell">
                  <div
                    className={`font-medium ${
                      useEstimated ? "text-primary italic" : "text-primary"
                    }`}
                  >
                    {useEstimated
                      ? refuel.estimated_fuel_consumption.toFixed(1)
                      : (
                          (refuel.amount /
                            refuel.kilometers_since_last_refuel) *
                          100
                        ).toFixed(1)}
                  </div>
                </td>
                <td className="px-1 sm:px-2 lg:px-4 py-2 sm:py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-primary font-medium">
                  {renderSvgFuelPrice(refuel.price, { showCurrency: false })}
                </td>
                <td className="px-1 sm:px-2 lg:px-4 py-2 sm:py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-primary font-medium">
                  {formatLiters(refuel.amount)}
                </td>
                <td className="px-1 sm:px-2 lg:px-4 py-2 sm:py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm font-bold text-primary text-right">
                  {formatCurrency(totalCost)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
