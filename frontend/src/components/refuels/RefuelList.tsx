import React from "react";
import { RefuelMetric } from "../../lib/api";

interface RefuelListProps {
  refuels: RefuelMetric[];
  loading?: boolean;
}

export default function RefuelList({ refuels, loading }: RefuelListProps) {
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Refuel Entries</h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading data...</span>
        </div>
      </div>
    );
  }

  if (!refuels || refuels.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Refuel Entries</h3>
        <div className="text-center py-8 text-gray-500">
          <p>No refuel entries recorded yet.</p>
          <p className="text-sm mt-1">Add your first refuel entry above.</p>
        </div>
      </div>
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
        }) + " (Today)"
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
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">
        Refuel Entries ({refuels?.length || 0})
      </h3>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price/L
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Cost
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kilometers
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Consumption
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Notes
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {refuels?.map((refuel, index) => {
              const totalCost = refuel.price * refuel.amount;
              const refuelDate = new Date(refuel.timestamp);
              const now = new Date();
              const isToday = refuelDate.toDateString() === now.toDateString();

              return (
                <tr
                  key={index}
                  className={`hover:bg-gray-50 ${
                    !isToday ? "bg-blue-50/30" : ""
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(refuel.timestamp)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatPricePerLiter(refuel.price)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatLiters(refuel.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(totalCost)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {refuel.kilometers_since_last_refuel.toFixed(0)} km
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div className="text-xs text-gray-500">
                        Est: {refuel.estimated_fuel_consumption.toFixed(1)}{" "}
                        L/100km
                      </div>
                      <div className="font-medium">
                        Act:{" "}
                        {(
                          (refuel.amount /
                            refuel.kilometers_since_last_refuel) *
                          100
                        ).toFixed(1)}{" "}
                        L/100km
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {refuel.notes || "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
