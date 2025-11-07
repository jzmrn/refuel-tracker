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
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
        <div className="text-secondary">Loading data points...</div>
      </div>
    );
  }

  if (dataPoints.length === 0) {
    return (
      <div className="empty-state">
        <svg
          className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600"
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
  const groupedData = dataPoints.reduce(
    (groups, point) => {
      const label = point.label;
      if (!groups[label]) {
        groups[label] = [];
      }
      groups[label].push(point);
      return groups;
    },
    {} as Record<string, DataPoint[]>,
  );

  // Get label color based on hash (consistent coloring)
  const getLabelColor = (label: string): string => {
    const colors = [
      "group-badge-blue",
      "group-badge-green",
      "group-badge-purple",
      "group-badge-yellow",
      "group-badge-red",
      "group-badge-indigo",
      "group-badge-pink",
      "group-badge-gray",
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
          <div key={label} className="group-card">
            <div className="group-header">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`group-badge ${getLabelColor(label)}`}>
                    {label}
                  </span>
                  <span className="text-sm text-secondary">
                    {points.length} {points.length === 1 ? "entry" : "entries"}
                  </span>
                </div>
                {points.length > 0 && (
                  <div className="text-sm text-secondary">
                    Latest:{" "}
                    {
                      points.reduce((latest, point) =>
                        new Date(point.timestamp) > new Date(latest.timestamp)
                          ? point
                          : latest,
                      ).value
                    }
                  </div>
                )}
              </div>
            </div>

            <div className="list-divider">
              {points
                .sort(
                  (a, b) =>
                    new Date(b.timestamp).getTime() -
                    new Date(a.timestamp).getTime(),
                )
                .map((point) => (
                  <div key={point.id} className="list-item">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <div className="text-2xl font-bold text-primary">
                            {typeof point.value === "number"
                              ? Number.isInteger(point.value)
                                ? point.value.toString()
                                : point.value.toFixed(2)
                              : point.value}
                          </div>
                          <div className="text-sm text-secondary">
                            <div>
                              {format(new Date(point.timestamp), "MMM d, yyyy")}
                            </div>
                            <div>
                              {format(new Date(point.timestamp), "h:mm a")}
                            </div>
                          </div>
                        </div>

                        {point.notes && (
                          <p className="notes-box mt-2">{point.notes}</p>
                        )}
                      </div>

                      <div className="ml-4">
                        <button
                          onClick={() => onDelete(point)}
                          className="btn bg-red-100 text-red-700 hover:bg-red-200 focus:ring-red-500 text-xs px-2 py-1 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
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
