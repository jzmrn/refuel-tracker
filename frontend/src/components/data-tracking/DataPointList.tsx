import React from "react";
import { format } from "date-fns";

import { DataPointResponse } from "@/lib/api";
import LoadingSpinner from "../common/LoadingSpinner";
import { ChartIcon, TrashIcon } from "../common/Icons";

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
    return <LoadingSpinner text="Loading data points..." />;
  }

  if (dataPoints.length === 0) {
    return (
      <div className="empty-state">
        <ChartIcon size="xl" color="gray" className="mx-auto mb-4" />
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
                          className="action-btn-delete"
                          title="Delete this data point"
                        >
                          <TrashIcon size="sm" color="red" />
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
