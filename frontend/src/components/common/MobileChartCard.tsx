import React from "react";

interface MobileChartCardProps {
  children: React.ReactNode;
}

/**
 * Container shown below a chart on mobile to display the details of the
 * selected data point (Option D tooltip replacement).
 * On sm+ screens this is never rendered — the caller should gate on `isMobile`.
 */
export function MobileChartCard({ children }: MobileChartCardProps) {
  return (
    <div className="mt-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm">
      {children}
    </div>
  );
}
