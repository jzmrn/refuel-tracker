import React from "react";

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBgColor?:
    | "blue"
    | "green"
    | "purple"
    | "yellow"
    | "red"
    | "indigo"
    | "orange"
    | "gray";
  loading?: boolean;
}

export default function SummaryCard({
  title,
  value,
  icon,
  iconBgColor = "blue",
  loading = false,
}: SummaryCardProps) {
  const iconBgClass = {
    blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    green:
      "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    purple:
      "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    yellow:
      "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400",
    red: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
    indigo:
      "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
    orange:
      "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
    gray: "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400",
  };

  return (
    <div className="card">
      {/* Icon on left, vertically centered; text content on right, stacked */}
      <div className="flex items-center">
        {/* Icon - vertically centered */}
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 flex-shrink-0 ${iconBgClass[iconBgColor]}`}
        >
          {icon}
        </div>

        {/* Text content - stacked vertically, left-aligned */}
        <div className="flex flex-col space-y-1 min-w-0 flex-1">
          <p className="text-sm font-medium text-secondary">{title}</p>
          <p className="text-xl font-bold text-primary lg:text-2xl">
            {loading ? "..." : value}
          </p>
        </div>
      </div>
    </div>
  );
}
