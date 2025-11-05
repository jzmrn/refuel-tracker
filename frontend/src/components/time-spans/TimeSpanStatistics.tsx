import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Rectangle,
} from "recharts";
import {
  format,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  parseISO,
  min as dateMin,
  max as dateMax,
} from "date-fns";
import { TimeSpanResponse } from "@/lib/api";

interface TimeSpanStatisticsProps {
  timeSpans: TimeSpanResponse[];
  label: string;
  loading?: boolean;
}

export default function TimeSpanStatistics({
  timeSpans,
  label,
  loading,
}: TimeSpanStatisticsProps) {
  // Calculate durations in minutes for easier calculations
  const calculateDurationMinutes = (startDate: string, endDate?: string) => {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    return differenceInMinutes(end, start);
  };

  // Get unique groups from timeSpans
  const availableGroups = useMemo(() => {
    const groupSet = new Set(timeSpans.map((span) => span.group || "General"));
    const groups = Array.from(groupSet);
    return groups.sort();
  }, [timeSpans]);

  const [selectedGroup, setSelectedGroup] = useState<string>(
    availableGroups[0] || "General"
  );

  // For responsive chart width
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(800);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  // Filter timeSpans by selected group
  const filteredTimeSpans = useMemo(() => {
    return timeSpans.filter(
      (span) => (span.group || "General") === selectedGroup
    );
  }, [timeSpans, selectedGroup]);

  // Prepare all calculated data
  const durations = filteredTimeSpans
    .filter((span) => span.end_date) // Only completed spans for statistics
    .map((span) => calculateDurationMinutes(span.start_date, span.end_date!));

  const completedSpans = filteredTimeSpans.filter((span) => span.end_date);
  const ongoingSpans = filteredTimeSpans.filter((span) => !span.end_date);

  // Calculate statistics
  const count = completedSpans.length;
  const ongoingCount = ongoingSpans.length;

  let stats = {
    total: 0,
    average: 0,
    min: 0,
    max: 0,
    median: 0,
  };

  if (durations.length > 0) {
    const totalMinutes = durations.reduce((acc, duration) => acc + duration, 0);
    stats.total = totalMinutes;
    stats.average = totalMinutes / count;
    stats.min = Math.min(...durations);
    stats.max = Math.max(...durations);

    // Calculate median
    const sortedDurations = [...durations].sort((a, b) => a - b);
    stats.median =
      count % 2 === 0
        ? (sortedDurations[count / 2 - 1] + sortedDurations[count / 2]) / 2
        : sortedDurations[Math.floor(count / 2)];
  }

  const formatDuration = (minutes: number) => {
    const days = Math.floor(minutes / (24 * 60));
    const hours = Math.floor((minutes % (24 * 60)) / 60);
    const mins = Math.floor(minutes % 60);

    if (days > 0) {
      return `${days}d ${hours}h ${mins}m`;
    } else if (hours > 0) {
      return `${hours}h ${mins}m`;
    } else {
      return `${mins}m`;
    }
  };

  // Prepare swimlane chart data - show individual time spans as bars on a timeline
  const swimlaneData = useMemo(() => {
    if (filteredTimeSpans.length === 0)
      return { chartData: [], minTime: 0, maxTime: 0, yLabels: [] };

    // Get time range for the chart
    const allTimes = filteredTimeSpans.flatMap((span) => [
      new Date(span.start_date).getTime(),
      span.end_date ? new Date(span.end_date).getTime() : new Date().getTime(),
    ]);
    const minTime = Math.min(...allTimes);
    const maxTime = Math.max(...allTimes);

    // Create chart data with each span as a horizontal bar
    const chartData = filteredTimeSpans
      .sort(
        (a, b) =>
          new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      )
      .map((span, index) => {
        const startTime = new Date(span.start_date).getTime();
        const endTime = span.end_date
          ? new Date(span.end_date).getTime()
          : new Date().getTime();
        const durationMs = endTime - startTime;

        return {
          id: span.id,
          label: span.label,
          swimlane: index, // Y-axis position
          startTime,
          endTime,
          durationMs,
          durationMinutes: Math.round(durationMs / (1000 * 60)),
          startDisplay: format(new Date(startTime), "MMM d, h:mm a"),
          endDisplay: span.end_date
            ? format(new Date(endTime), "MMM d, h:mm a")
            : "Ongoing",
          isOngoing: !span.end_date,
          notes: span.notes,
          // For the scatter plot, we'll use start time as x and swimlane as y
          x: startTime,
          y: index,
          width: durationMs, // We'll use this for custom rendering
        };
      });

    // Create Y-axis labels (span labels)
    const yLabels = chartData.map((item, index) => ({
      value: index,
      label:
        item.label.length > 20
          ? item.label.substring(0, 20) + "..."
          : item.label,
    }));

    return { chartData, minTime, maxTime, yLabels };
  }, [filteredTimeSpans]);

  // Custom Gantt Chart Component
  const GanttChart = ({ width }: { width: number }) => {
    if (swimlaneData.chartData.length === 0) return null;

    const chartHeight = Math.max(300, swimlaneData.chartData.length * 40 + 100);
    const chartWidth = width;
    const padding = { top: 20, right: 50, bottom: 60, left: 150 };
    const plotWidth = chartWidth - padding.left - padding.right;
    const plotHeight = chartHeight - padding.top - padding.bottom;

    const timeRange = swimlaneData.maxTime - swimlaneData.minTime;

    // Color scheme for different spans
    const getColor = (index: number, isOngoing: boolean) => {
      const colors = [
        "#3b82f6",
        "#ef4444",
        "#10b981",
        "#f59e0b",
        "#8b5cf6",
        "#06b6d4",
        "#f97316",
        "#84cc16",
        "#ec4899",
        "#6b7280",
      ];
      const baseColor = colors[index % colors.length];
      return isOngoing ? "#22c55e" : baseColor;
    };

    const formatTimeAxis = (timestamp: number) => {
      const date = new Date(timestamp);
      if (timeRange > 7 * 24 * 60 * 60 * 1000) {
        // More than a week
        return format(date, "MMM d");
      } else if (timeRange > 24 * 60 * 60 * 1000) {
        // More than a day
        return format(date, "MMM d HH:mm");
      } else {
        return format(date, "HH:mm");
      }
    };

    return (
      <div className="w-full">
        <svg
          width={chartWidth}
          height={chartHeight}
          className="border border-gray-200 rounded w-full"
        >
          {/* Background */}
          <rect width={chartWidth} height={chartHeight} fill="#fafafa" />

          {/* Y-axis labels */}
          {swimlaneData.chartData.map((item, index) => (
            <text
              key={`y-label-${index}`}
              x={padding.left - 10}
              y={
                padding.top +
                index * (plotHeight / swimlaneData.chartData.length) +
                plotHeight / swimlaneData.chartData.length / 2
              }
              textAnchor="end"
              dominantBaseline="middle"
              fontSize="12"
              fill="#374151"
              className="font-medium"
            >
              {item.label.length > 15
                ? item.label.substring(0, 15) + "..."
                : item.label}
            </text>
          ))}

          {/* Grid lines */}
          {swimlaneData.chartData.map((_, index) => (
            <line
              key={`grid-${index}`}
              x1={padding.left}
              y1={
                padding.top +
                index * (plotHeight / swimlaneData.chartData.length) +
                plotHeight / swimlaneData.chartData.length
              }
              x2={padding.left + plotWidth}
              y2={
                padding.top +
                index * (plotHeight / swimlaneData.chartData.length) +
                plotHeight / swimlaneData.chartData.length
              }
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          ))}

          {/* Time axis */}
          {Array.from({ length: 6 }, (_, i) => {
            const timePoint = swimlaneData.minTime + (timeRange * i) / 5;
            const x = padding.left + (plotWidth * i) / 5;
            return (
              <g key={`time-axis-${i}`}>
                <line
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={padding.top + plotHeight}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />
                <text
                  x={x}
                  y={padding.top + plotHeight + 20}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#6b7280"
                >
                  {formatTimeAxis(timePoint)}
                </text>
              </g>
            );
          })}

          {/* Time span bars */}
          {swimlaneData.chartData.map((item, index) => {
            const y =
              padding.top +
              index * (plotHeight / swimlaneData.chartData.length) +
              10;
            const barHeight = plotHeight / swimlaneData.chartData.length - 20;
            const x =
              padding.left +
              ((item.startTime - swimlaneData.minTime) / timeRange) * plotWidth;
            const width = Math.max(
              3,
              (item.durationMs / timeRange) * plotWidth
            );

            return (
              <g key={`bar-${item.id}`}>
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={barHeight}
                  fill={getColor(index, item.isOngoing)}
                  rx="3"
                  opacity="0.8"
                  className="hover:opacity-100 cursor-pointer"
                >
                  <title>
                    {`${item.label}\nStart: ${item.startDisplay}\nEnd: ${
                      item.endDisplay
                    }\nDuration: ${formatDuration(item.durationMinutes)}`}
                    {item.notes ? `\nNotes: ${item.notes}` : ""}
                  </title>
                </rect>
                {item.isOngoing && (
                  <circle
                    cx={x + width - 5}
                    cy={y + barHeight / 2}
                    r="3"
                    fill="#22c55e"
                    className="animate-pulse"
                  />
                )}
              </g>
            );
          })}

          {/* Chart title */}
          <text
            x={chartWidth / 2}
            y={20}
            textAnchor="middle"
            fontSize="14"
            fontWeight="600"
            fill="#1f2937"
          >
            Timeline for "{selectedGroup}" Group
          </text>
        </svg>
      </div>
    );
  };

  // Render conditions after all hooks
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Statistics for {label}</h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading statistics...</span>
        </div>
      </div>
    );
  }

  if (!timeSpans || timeSpans.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Statistics for {label}</h3>
        <div className="text-center py-8 text-gray-500">
          <p>No time spans available for "{label}".</p>
          <p className="text-sm mt-1">Add some time spans to see statistics.</p>
        </div>
      </div>
    );
  }

  if (filteredTimeSpans.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Statistics for {label}</h3>

        {/* Group Selection */}
        <div className="mb-6">
          <label
            htmlFor="group-select"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Select Group
          </label>
          <select
            id="group-select"
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="block w-48 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            {availableGroups.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </div>

        <div className="text-center py-8 text-gray-500">
          <p>No time spans available for group "{selectedGroup}".</p>
          <p className="text-sm mt-1">
            Try selecting a different group or add some time spans.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Statistics for "{label}"</h3>

      {/* Group Selection */}
      <div className="mb-6">
        <label
          htmlFor="group-select"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Select Group for Timeline
        </label>
        <select
          id="group-select"
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
          className="block w-48 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          {availableGroups.map((group) => (
            <option key={group} value={group}>
              {group} (
              {
                timeSpans.filter((span) => (span.group || "General") === group)
                  .length
              }{" "}
              spans)
            </option>
          ))}
        </select>
        <p className="mt-1 text-sm text-gray-500">
          Showing statistics and timeline for "{selectedGroup}" group (
          {filteredTimeSpans.length} spans)
        </p>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {formatDuration(stats.average)}
          </div>
          <div className="text-sm text-blue-600 font-medium">Avg Duration</div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {formatDuration(stats.total)}
          </div>
          <div className="text-sm text-green-600 font-medium">Total Time</div>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">
            {formatDuration(stats.max)}
          </div>
          <div className="text-sm text-yellow-600 font-medium">Longest</div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">{count}</div>
          <div className="text-sm text-purple-600 font-medium">Completed</div>
        </div>
      </div>

      {/* Additional Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-red-50 p-3 rounded">
          <div className="font-medium text-red-900">Shortest</div>
          <div className="text-red-700">{formatDuration(stats.min)}</div>
        </div>
        <div className="bg-indigo-50 p-3 rounded">
          <div className="font-medium text-indigo-900">Median</div>
          <div className="text-indigo-700">{formatDuration(stats.median)}</div>
        </div>
        <div className="bg-orange-50 p-3 rounded">
          <div className="font-medium text-orange-900">Ongoing</div>
          <div className="text-orange-700">{ongoingCount}</div>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <div className="font-medium text-gray-900">Total Entries</div>
          <div className="text-gray-700">{count + ongoingCount}</div>
        </div>
      </div>

      {/* Gantt Chart - Timeline with swimlanes for individual entries */}
      {swimlaneData.chartData.length > 0 && (
        <div className="mt-6">
          <h4 className="text-md font-semibold mb-3 text-gray-700">
            Timeline Swimlanes for "{selectedGroup}" Group
          </h4>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div ref={containerRef} className="w-full">
              <GanttChart width={containerWidth} />
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-4 h-3 bg-blue-500 rounded opacity-80"></div>
                <span>Completed spans</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-3 bg-green-500 rounded opacity-80"></div>
                <span>Ongoing spans</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Active indicator</span>
              </div>
            </div>

            <div className="mt-3 text-xs text-gray-600">
              <p>• Each row represents one time span entry</p>
              <p>• Hover over bars to see detailed information</p>
              <p>• Time is shown on the X-axis, individual entries on Y-axis</p>
              <p>• Green bars indicate ongoing activities</p>
            </div>
          </div>
        </div>
      )}

      {swimlaneData.chartData.length === 0 && filteredTimeSpans.length > 0 && (
        <div className="mt-6 bg-yellow-50 p-4 rounded-lg">
          <h4 className="text-md font-semibold mb-2 text-yellow-800">
            No Timeline Data Available
          </h4>
          <p className="text-sm text-yellow-700">
            No time spans available for the "{selectedGroup}" group. Try
            selecting a different group.
          </p>
        </div>
      )}

      {/* Ongoing Activities */}
      {ongoingCount > 0 && (
        <div className="mt-6 bg-green-50 p-4 rounded-lg">
          <h4 className="text-md font-semibold mb-2 text-green-800">
            Current Ongoing Activities
          </h4>
          <div className="space-y-2">
            {ongoingSpans.map((span) => (
              <div key={span.id} className="text-sm text-green-700">
                Started:{" "}
                {format(new Date(span.start_date), "MMM d, yyyy 'at' h:mm a")}
                <span className="ml-2 font-medium">
                  (Running for{" "}
                  {formatDuration(calculateDurationMinutes(span.start_date))})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
