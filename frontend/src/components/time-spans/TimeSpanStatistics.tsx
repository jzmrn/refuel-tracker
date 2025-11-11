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
import SummaryCard, { type ValueUnit } from "../common/SummaryCard";
import LoadingSpinner from "../common/LoadingSpinner";
import {
  ClockIcon,
  ChartIcon,
  TrendingUpIcon,
  CheckCircleIcon,
  TrendingDownIcon,
  HashIcon,
} from "../common/Icons";
import { EmptyState } from "../common";
import { GridLayout } from "../common/GridLayout";
import { useTranslation } from "@/lib/i18n/LanguageContext";

// Import the chart theme hook
import { useChartTheme } from "../../lib/theme";

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
  const { t } = useTranslation();
  const chartTheme = useChartTheme();

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

  const [selectedGroup, setSelectedGroup] = useState<string>("General");

  // Update selected group when available groups change
  useEffect(() => {
    if (availableGroups.length > 0) {
      // Find the first group that has time spans, or use the first available
      const groupWithData = availableGroups.find((group) =>
        timeSpans.some((span) => (span.group || "General") === group),
      );
      setSelectedGroup(groupWithData || availableGroups[0]);
    }
  }, [availableGroups, timeSpans]);

  // For responsive chart width
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(800);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        // Use clientWidth for the inner width excluding scrollbars
        const width =
          containerRef.current.clientWidth || containerRef.current.offsetWidth;
        setContainerWidth(width);
      }
    };

    // Use a slight delay to ensure the container is fully rendered
    const timer = setTimeout(updateWidth, 100);

    const resizeObserver = new ResizeObserver(() => {
      updateWidth();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener("resize", updateWidth);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateWidth);
      resizeObserver.disconnect();
    };
  }, []);

  // Filter timeSpans by selected group
  const filteredTimeSpans = useMemo(() => {
    return timeSpans.filter(
      (span) => (span.group || "General") === selectedGroup,
    );
  }, [timeSpans, selectedGroup]);

  // Prepare all calculated data - use ALL time spans for statistics, not just filtered
  const durations = timeSpans
    .filter((span) => span.end_date) // Only completed spans for statistics
    .map((span) => calculateDurationMinutes(span.start_date, span.end_date!));

  const completedSpans = timeSpans.filter((span) => span.end_date);
  const ongoingSpans = timeSpans.filter((span) => !span.end_date);

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

    const values: ValueUnit[] = [];
    if (days > 0) values.push({ value: days, unit: "d" });
    if (hours > 0) values.push({ value: hours, unit: "h" });
    if (mins > 0) values.push({ value: mins, unit: "m" });
    return values;
  };

  const formatDurationString = (values: ValueUnit[]) => {
    return values.map((item) => `${item.value}${item.unit}`).join(" ");
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
          new Date(a.start_date).getTime() - new Date(b.start_date).getTime(),
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
            : t.timeSpans.ongoing,
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
    const chartWidth = Math.max(width - 32, 400); // Use full container width minus padding, minimum 400px

    // Calculate dynamic left padding based on longest label
    const maxLabelLength = Math.max(
      ...swimlaneData.chartData.map((item) => item.label.length),
    );
    const dynamicLeftPadding = Math.max(
      80,
      Math.min(200, maxLabelLength * 7 + 20),
    ); // Min 80px, max 200px, ~7px per character

    const padding = {
      top: 20,
      right: 20,
      bottom: 60,
      left: dynamicLeftPadding,
    };
    const plotWidth = chartWidth - padding.left - padding.right;
    const plotHeight = chartHeight - padding.top - padding.bottom;

    const timeRange = swimlaneData.maxTime - swimlaneData.minTime;

    // Color scheme for different spans - theme aware
    const getColor = (index: number, isOngoing: boolean) => {
      const lightColors = [
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
      const darkColors = [
        "#60A5FA",
        "#F87171",
        "#34D399",
        "#FBBF24",
        "#A78BFA",
        "#22D3EE",
        "#FB923C",
        "#A3E635",
        "#F472B6",
        "#9CA3AF",
      ];
      const colors =
        chartTheme.background === "#1F2937" ? darkColors : lightColors;
      const baseColor = colors[index % colors.length];
      return isOngoing
        ? chartTheme.background === "#1F2937"
          ? "#34D399"
          : "#22c55e"
        : baseColor;
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
      <div className="w-full overflow-x-auto">
        <svg
          width={chartWidth}
          height={chartHeight}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="border border-gray-200 rounded dark:border-gray-700"
          style={{ width: "100%", height: "auto", minWidth: "400px" }}
        >
          {/* Background */}
          <rect
            width={chartWidth}
            height={chartHeight}
            fill={chartTheme.background}
          />

          {/* Y-axis labels */}
          {swimlaneData.chartData.map((item, index) => {
            // Calculate max characters that fit in the available space
            const maxChars = Math.max(
              10,
              Math.floor((dynamicLeftPadding - 20) / 7),
            );
            const displayLabel =
              item.label.length > maxChars
                ? item.label.substring(0, maxChars) + "..."
                : item.label;

            return (
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
                fill={chartTheme.text}
                className="font-medium"
              >
                {displayLabel}
              </text>
            );
          })}

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
              stroke={chartTheme.gridLine}
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
                  stroke={chartTheme.gridLine}
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />
                <text
                  x={x}
                  y={padding.top + plotHeight + 20}
                  textAnchor="middle"
                  fontSize="11"
                  fill={chartTheme.textSecondary}
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
              (item.durationMs / timeRange) * plotWidth,
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
                    }\nDuration: ${formatDurationString(
                      formatDuration(item.durationMinutes),
                    )}`}
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
            fill={chartTheme.text}
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
      <div className="panel">
        <h3 className="heading-3 mb-4">
          {t.timeSpans.statisticsFor} {label}
        </h3>
        <LoadingSpinner text={t.dataTracking.loadingStatistics} />
      </div>
    );
  }

  if (!timeSpans || timeSpans.length === 0) {
    return (
      <EmptyState
        icon={<ClockIcon size="xl" color="gray" className="mx-auto mb-4" />}
        title={t.common.noData}
        className="empty-state py-8"
      />
    );
  }

  return (
    <div className="panel">
      <h3 className="heading-3 mb-4">
        {t.timeSpans.statisticsFor} "{label}"
      </h3>

      {/* Group Selection */}
      <div className="mb-6">
        <label htmlFor="group-select" className="label">
          {t.timeSpans.selectGroupTimeline}
        </label>
        <select
          id="group-select"
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
          className="input w-48"
        >
          {availableGroups.map((group) => (
            <option key={group} value={group}>
              {group} (
              {
                timeSpans.filter((span) => (span.group || "General") === group)
                  .length
              }{" "}
              {t.common.spans})
            </option>
          ))}
        </select>
        <p className="mt-1 text-sm text-secondary">
          {t.timeSpans.statisticsShowAllSpans} ({timeSpans.length}{" "}
          {t.common.total}) • {t.timeSpans.timelineShows}"{selectedGroup}"{" "}
          {t.timeSpans.groupOnly} ({filteredTimeSpans.length}{" "}
          {t.timeSpans.spans})
        </p>
      </div>

      {/* Summary Statistics */}
      <GridLayout variant="stats" className="mb-6">
        <SummaryCard
          title={t.timeSpans.avgDuration}
          value={formatDuration(stats.average)}
          icon={<ClockIcon size="lg" color="blue" />}
          iconBgColor="blue"
        />

        <SummaryCard
          title={t.timeSpans.totalTime}
          value={formatDuration(stats.total)}
          icon={<ChartIcon size="lg" color="green" />}
          iconBgColor="green"
        />

        <SummaryCard
          title={t.timeSpans.longest}
          value={formatDuration(stats.max)}
          icon={<TrendingUpIcon size="lg" color="yellow" />}
          iconBgColor="yellow"
        />

        <SummaryCard
          title={t.timeSpans.completed}
          value={{ value: count.toString(), unit: "" }}
          icon={<CheckCircleIcon size="lg" color="purple" />}
          iconBgColor="purple"
        />
      </GridLayout>

      {/* Additional Statistics */}
      <GridLayout variant="stats" className="mb-6">
        <SummaryCard
          title={t.timeSpans.shortest}
          value={formatDuration(stats.min)}
          icon={<TrendingDownIcon size="lg" color="red" />}
          iconBgColor="red"
        />

        <SummaryCard
          title={t.timeSpans.median}
          value={formatDuration(stats.median)}
          icon={<ChartIcon size="lg" color="indigo" />}
          iconBgColor="indigo"
        />

        <SummaryCard
          title={t.timeSpans.ongoing}
          value={{ value: ongoingCount.toString(), unit: "" }}
          icon={<ClockIcon size="lg" color="orange" />}
          iconBgColor="orange"
        />

        <SummaryCard
          title={t.timeSpans.totalSpansCount}
          value={{ value: (count + ongoingCount).toString(), unit: "" }}
          icon={<HashIcon size="lg" color="gray" />}
          iconBgColor="gray"
        />
      </GridLayout>

      {/* Gantt Chart - Timeline with swimlanes for individual entries */}
      {swimlaneData.chartData.length > 0 && (
        <div className="mt-6">
          <h4 className="heading-4 mb-3">
            {t.timeSpans.timelineSwimlanes} "{selectedGroup}"{" "}
            {t.timeSpans.group}
          </h4>

          <div className="chart-container">
            <div ref={containerRef} className="w-full">
              <GanttChart width={containerWidth} />
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-xs text-secondary">
              <div className="flex items-center gap-2">
                <div className="w-4 h-3 bg-blue-500 rounded opacity-80"></div>
                <span>{t.timeSpans.completedSpans}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-3 bg-green-500 rounded opacity-80"></div>
                <span>{t.timeSpans.ongoingSpans}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>{t.timeSpans.activeIndicator}</span>
              </div>
            </div>

            <div className="mt-3 text-xs text-secondary">
              <p>• {t.timeSpans.chartHelpRow}</p>
              <p>• {t.timeSpans.chartHelpHover}</p>
              <p>• {t.timeSpans.chartHelpAxes}</p>
              <p>• {t.timeSpans.chartHelpGreen}</p>
            </div>
          </div>
        </div>
      )}

      {filteredTimeSpans.length === 0 && (
        <div className="mt-6 status-yellow p-4 rounded-lg">
          <h4 className="heading-4 mb-2">{t.timeSpans.noTimelineData}</h4>
          <p className="text-sm mb-3">
            {t.timeSpans.noTimeSpansForGroup} "{selectedGroup}"{" "}
            {t.timeSpans.group}.
          </p>
          <div className="flex flex-wrap gap-2">
            {availableGroups
              .filter((group) =>
                timeSpans.some((span) => (span.group || "General") === group),
              )
              .map((group) => (
                <button
                  key={group}
                  onClick={() => setSelectedGroup(group)}
                  className="btn-sm-secondary"
                >
                  {t.timeSpans.switchTo} "{group}" (
                  {
                    timeSpans.filter(
                      (span) => (span.group || "General") === group,
                    ).length
                  }{" "}
                  {t.common.spans})
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Ongoing Activities - show filtered ongoing spans for the selected group */}
      {filteredTimeSpans.filter((span) => !span.end_date).length > 0 && (
        <div className="mt-6 status-green p-4 rounded-lg">
          <h4 className="heading-4 mb-2">
            {t.timeSpans.currentOngoingActivities} "{selectedGroup}"
          </h4>
          <div className="space-y-2">
            {filteredTimeSpans
              .filter((span) => !span.end_date)
              .map((span) => (
                <div key={span.id} className="text-sm">
                  {t.timeSpans.started}:{" "}
                  {format(new Date(span.start_date), "MMM d, yyyy 'at' h:mm a")}
                  <span className="ml-2 font-medium">
                    ({t.timeSpans.runningFor}{" "}
                    {formatDurationString(
                      formatDuration(calculateDurationMinutes(span.start_date)),
                    )}
                    )
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
