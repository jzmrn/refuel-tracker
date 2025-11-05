import React from "react";
import {
  format,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
} from "date-fns";
import { TimeSpanResponse } from "@/lib/api";

interface TimeSpanListProps {
  timeSpans: TimeSpanResponse[];
  onDelete: (timeSpan: TimeSpanResponse) => void;
  onEdit?: (timeSpan: TimeSpanResponse) => void;
  loading?: boolean;
}

export default function TimeSpanList({
  timeSpans,
  onDelete,
  onEdit,
  loading,
}: TimeSpanListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading time spans...</span>
      </div>
    );
  }

  if (!timeSpans || timeSpans.length === 0) {
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
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-lg font-medium mb-2">No time spans yet</p>
        <p>Start tracking by adding your first time span above</p>
      </div>
    );
  }

  // Group time spans by group for better organization
  const groupedTimeSpans = timeSpans.reduce(
    (groups, span) => {
      const group = span.group || "General";
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(span);
      return groups;
    },
    {} as Record<string, TimeSpanResponse[]>,
  );

  // Get group color based on hash (consistent coloring)
  const getGroupColor = (group: string): string => {
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
    for (let i = 0; i < group.length; i++) {
      hash = (hash << 5) - hash + group.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const calculateDuration = (startDate: string, endDate?: string) => {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();

    const totalMinutes = differenceInMinutes(end, start);
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = totalMinutes % 60;

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), "MMM d, yyyy 'at' h:mm a");
  };

  const formatDateTimeShort = (dateString: string) => {
    return format(new Date(dateString), "MMM d, h:mm a");
  };

  const isOngoing = (span: TimeSpanResponse) => !span.end_date;

  const calculateTotalDuration = (spans: TimeSpanResponse[]) => {
    const totalMinutes = spans.reduce((total, span) => {
      const start = new Date(span.start_date);
      const end = span.end_date ? new Date(span.end_date) : new Date();
      return total + differenceInMinutes(end, start);
    }, 0);

    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = totalMinutes % 60;

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  return (
    <div className="space-y-6">
      {Object.entries(groupedTimeSpans)
        .sort(([, a], [, b]) => b.length - a.length) // Sort by number of entries
        .map(([group, spans]) => (
          <div
            key={group}
            className="border border-gray-200 rounded-lg overflow-hidden"
          >
            <div className="bg-white px-4 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getGroupColor(
                      group,
                    )}`}
                  >
                    {group}
                  </span>
                  <span className="text-sm text-gray-600">
                    {spans.length} {spans.length === 1 ? "span" : "spans"}
                  </span>
                </div>
                {spans.length > 0 && (
                  <div className="text-sm text-gray-500">
                    Total: {calculateTotalDuration(spans)}
                  </div>
                )}
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {spans
                .sort(
                  (a, b) =>
                    new Date(b.start_date).getTime() -
                    new Date(a.start_date).getTime(),
                )
                .map((span) => (
                  <div
                    key={span.id}
                    className="p-4 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="text-lg font-medium text-gray-900">
                            {span.label}
                          </div>
                          {isOngoing(span) && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Ongoing
                            </span>
                          )}
                        </div>

                        <div className="space-y-1 text-sm text-gray-600">
                          <div className="flex items-center gap-4">
                            <div>
                              <span className="font-medium">Started:</span>{" "}
                              {formatDateTime(span.start_date)}
                            </div>
                            {span.end_date && (
                              <div>
                                <span className="font-medium">Ended:</span>{" "}
                                {formatDateTime(span.end_date)}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-4">
                            <div>
                              <span className="font-medium">Duration:</span>{" "}
                              <span className="text-blue-600 font-semibold">
                                {calculateDuration(
                                  span.start_date,
                                  span.end_date || undefined,
                                )}
                              </span>
                              {isOngoing(span) && (
                                <span className="text-gray-500">
                                  {" "}
                                  (and counting...)
                                </span>
                              )}
                            </div>
                          </div>

                          {span.notes && (
                            <div className="mt-2">
                              <p className="text-sm text-gray-600 bg-white p-2 rounded border border-gray-200">
                                {span.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {onEdit && (
                          <button
                            onClick={() => onEdit(span)}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                            title="Edit time span"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => onDelete(span)}
                          className="btn bg-red-100 text-red-700 hover:bg-red-200 focus:ring-red-500 text-xs px-2 py-1"
                          title="Delete time span"
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
