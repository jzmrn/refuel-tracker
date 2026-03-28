/**
 * Shared chart configuration for consistent styling across all Recharts components
 */

import { useRef } from "react";
import { useTheme } from "@/lib/theme";

// CSS class names for Recharts components (Tailwind-compatible)
export const chartClassNames = {
  /** XAxis and YAxis text styling */
  axisText: "text-xs fill-gray-600 dark:fill-gray-400",
  /** CartesianGrid stroke styling (for reference, use useGridConfig hook instead) */
  gridStroke: "stroke-gray-300 dark:stroke-gray-800",
  /** Legend text styling */
  legendText: "text-sm text-gray-600 dark:text-gray-400",
} as const;

// Grid colors (matching Tailwind gray-300 and gray-700)
const gridColors = {
  light: "#d1d5db", // gray-300
  dark: "#374151", // gray-700
} as const;

// Axis text colors (matching Tailwind gray-600 and gray-400)
const axisColors = {
  light: "#4b5563", // gray-600
  dark: "#9ca3af", // gray-400
} as const;

// Hook to get theme-aware grid configuration
export const useGridConfig = () => {
  const { currentTheme } = useTheme();
  const isDark = currentTheme === "dark";

  return {
    strokeDasharray: "3 3",
    stroke: isDark ? gridColors.dark : gridColors.light,
  };
};

// Hook to get theme-aware axis colors (for custom tick renderers)
export const useAxisColor = () => {
  const { currentTheme } = useTheme();
  const isDark = currentTheme === "dark";

  return isDark ? axisColors.dark : axisColors.light;
};

// Helper to create a custom tick renderer for YAxis
export const createYAxisTick = (
  axisColor: string,
  formatValue: (value: number) => React.ReactNode,
) => {
  return (props: { x: number; y: number; payload: { value: number } }) => {
    const { x, y, payload } = props;
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={4}
          textAnchor="end"
          fill={axisColor}
          fontSize={12}
        >
          {formatValue(payload.value)}
        </text>
      </g>
    );
  };
};

// Default axis configuration
export const axisConfig = {
  xAxis: {
    className: chartClassNames.axisText,
    textAnchor: "middle" as const,
    height: 40,
    tickMargin: 10,
    fontSize: 12,
  },
  yAxis: {
    className: chartClassNames.axisText,
    width: 40,
    fontSize: 12,
  },
} as const;

// Tooltip styling (inline styles for Recharts Tooltip)
export const tooltipStyle = {
  contentStyle: {
    backgroundColor: "#1f2937",
    borderColor: "#4b5563",
    borderRadius: "8px",
    color: "#f9fafb",
    boxShadow:
      "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  },
  wrapperStyle: {
    border: "1px solid #4b5563",
  },
} as const;

// Custom tooltip container styling (for custom tooltip content)
export const customTooltipContainerStyle = {
  backgroundColor: "#1f2937",
  borderColor: "#4b5563",
  border: "1px solid #4b5563",
} as const;

// Static grid configuration (deprecated - use useGridConfig hook instead for proper dark mode support)
export const gridConfig = {
  strokeDasharray: "3 3",
  className: chartClassNames.gridStroke,
} as const;

// Legend formatter component helper
export const renderLegendText = (value: string) => (
  <span className={chartClassNames.legendText}>{value}</span>
);

// Hook to force chart remount on data change (animate from zero instead of morphing)
export function useChartKey(data: unknown): number {
  const keyRef = useRef(0);
  const prevDataRef = useRef(data);

  if (prevDataRef.current !== data) {
    prevDataRef.current = data;
    keyRef.current += 1;
  }

  return keyRef.current;
}
