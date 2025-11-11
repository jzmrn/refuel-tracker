import { useTheme } from "@/lib/theme";

// Hook to get theme-appropriate colors for charts
export const useChartTheme = () => {
  const { currentTheme } = useTheme();
  const isDark = currentTheme === "dark";

  return {
    grid: isDark ? "#374151" : "#f0f0f0",
    axis: isDark ? "#9CA3AF" : "#666666",
    primaryLine: isDark ? "#3B82F6" : "#3b82f6",
    primaryDot: isDark ? "#3B82F6" : "#3b82f6",
    secondaryLine: isDark ? "#10B981" : "#10b981",
    secondaryDot: isDark ? "#10B981" : "#10b981",
    secondaryActiveDot: isDark ? "#059669" : "#059669",
    activeDotStroke: isDark ? "#1F2937" : "#ffffff",
    background: isDark ? "#1F2937" : "#FAFAFA",
    border: isDark ? "#374151" : "#E5E7EB",
    text: isDark ? "#F9FAFB" : "#374151",
    textSecondary: isDark ? "#9CA3AF" : "#6B7280",
    gridLine: isDark ? "#374151" : "#E5E7EB",
  };
};
