import React from "react";
import {
  format,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
} from "date-fns";
import { TimeSpanResponse } from "@/lib/api";
import LoadingSpinner from "../common/LoadingSpinner";
import { ClockIcon, EditIcon, TrashIcon } from "../common/Icons";

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
    return <LoadingSpinner text="Loading time spans..." />;
  }

  if (!timeSpans || timeSpans.length === 0) {
    return (
      <div className="empty-state">
        <ClockIcon size="xl" color="gray" className="mx-auto mb-4" />
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
          <div key={group} className="group-card">
            <div className="group-header">
              <div className="flex-between">
                <div className="flex-center gap-2">
                  <span className={`group-badge ${getGroupColor(group)}`}>
                    {group}
                  </span>
                  <span className="text-sm text-secondary">
                    {spans.length} {spans.length === 1 ? "span" : "spans"}
                  </span>
                </div>
                {spans.length > 0 && (
                  <div className="text-sm text-secondary">
                    Total: {calculateTotalDuration(spans)}
                  </div>
                )}
              </div>
            </div>

            <div className="list-divider">
              {spans
                .sort(
                  (a, b) =>
                    new Date(b.start_date).getTime() -
                    new Date(a.start_date).getTime(),
                )
                .map((span) => (
                  <div key={span.id} className="list-item">
                    <div className="flex-start justify-between">
                      <div className="flex-1">
                        <div className="flex-center gap-3 mb-2">
                          <div className="text-lg font-medium text-primary">
                            {span.label}
                          </div>
                          {isOngoing(span) && (
                            <span className="status-badge-ongoing">
                              Ongoing
                            </span>
                          )}
                        </div>

                        <div className="space-y-1 text-sm text-secondary">
                          <div className="flex-center gap-4">
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

                          <div className="flex-center gap-4">
                            <div>
                              <span className="font-medium">Duration:</span>{" "}
                              <span className="text-blue-600 font-semibold dark:text-blue-400">
                                {calculateDuration(
                                  span.start_date,
                                  span.end_date || undefined,
                                )}
                              </span>
                              {isOngoing(span) && (
                                <span className="text-secondary">
                                  {" "}
                                  (and counting...)
                                </span>
                              )}
                            </div>
                          </div>

                          {span.notes && (
                            <div className="mt-2">
                              <p className="notes-box">{span.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex-center gap-2 ml-4">
                        {onEdit && (
                          <button
                            onClick={() => onEdit(span)}
                            className="action-btn-edit"
                            title="Edit time span"
                          >
                            <EditIcon size="sm" color="indigo" />
                          </button>
                        )}
                        <button
                          onClick={() => onDelete(span)}
                          className="action-btn-delete"
                          title="Delete time span"
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
