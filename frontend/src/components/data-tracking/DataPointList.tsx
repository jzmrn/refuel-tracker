import React from "react";
import { format } from "date-fns";

import { DataPointResponse } from "@/lib/api";

export type DataPoint = DataPointResponse;

interface DataPointListProps {
  dataPoints: DataPoint[];
  onDelete: (dataPoint: DataPoint) => void;
  loading: boolean;
}

export default function DataPointList({
  dataPoints,
  onDelete,
  loading,
}: DataPointListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Loading data points...</div>
      </div>
    );
  }

  if (dataPoints.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <svg
          className="w-12 h-12 mx-auto mb-4 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        <p className="text-lg font-medium mb-2">No data points yet</p>
        <p>Start tracking by adding your first data point above</p>
      </div>
    );
  }

  // Group data points by label for better organization
  const groupedData = dataPoints.reduce((groups, point) => {
    const label = point.label;
    if (!groups[label]) {
      groups[label] = [];
    }
    groups[label].push(point);
    return groups;
  }, {} as Record<string, DataPoint[]>);

  // Get label color based on hash (consistent coloring)
  const getLabelColor = (label: string): string => {
    const colors = [
      "bg-blue-100 text-blue-800",
      "bg-green-100 text-green-800",
      "bg-purple-100 text-purple-800",
      "bg-yellow-100 text-yellow-800",
      "bg-red-100 text-red-800",
      "bg-indigo-100 text-indigo-800",
      "bg-pink-100 text-pink-800",
      "bg-gray-100 text-gray-800",
    ];

    let hash = 0;
    for (let i = 0; i < label.length; i++) {
      hash = (hash << 5) - hash + label.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="space-y-6">
      {Object.entries(groupedData)
        .sort(([, a], [, b]) => b.length - a.length) // Sort by number of entries
        .map(([label, points]) => (
          <div
            key={label}
            className="border border-gray-200 rounded-lg overflow-hidden"
          >
            <div className="bg-white px-4 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getLabelColor(
                      label
                    )}`}
                  >
                    {label}
                  </span>
                  <span className="text-sm text-gray-600">
                    {points.length} {points.length === 1 ? "entry" : "entries"}
                  </span>
                </div>
                {points.length > 0 && (
                  <div className="text-sm text-gray-500">
                    Latest:{" "}
                    {
                      points.reduce((latest, point) =>
                        new Date(point.timestamp) > new Date(latest.timestamp)
                          ? point
                          : latest
                      ).value
                    }
                  </div>
                )}
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {points
                .sort(
                  (a, b) =>
                    new Date(b.timestamp).getTime() -
                    new Date(a.timestamp).getTime()
                )
                .map((point) => (
                  <div
                    key={point.id}
                    className="p-4 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <div className="text-2xl font-bold text-gray-900">
                            {typeof point.value === "number"
                              ? Number.isInteger(point.value)
                                ? point.value.toString()
                                : point.value.toFixed(2)
                              : point.value}
                          </div>
                          <div className="text-sm text-gray-500">
                            <div>
                              {format(new Date(point.timestamp), "MMM d, yyyy")}
                            </div>
                            <div>
                              {format(new Date(point.timestamp), "h:mm a")}
                            </div>
                          </div>
                        </div>

                        {point.notes && (
                          <p className="text-sm text-gray-600 mt-2 bg-white p-2 rounded border border-gray-200">
                            {point.notes}
                          </p>
                        )}
                      </div>

                      <div className="ml-4">
                        <button
                          onClick={() => onDelete(point)}
                          className="btn bg-red-100 text-red-700 hover:bg-red-200 focus:ring-red-500 text-xs px-2 py-1"
                          title="Delete this data point"
                        >
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
    </div>
  );
}
