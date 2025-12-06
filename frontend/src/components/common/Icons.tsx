import React from "react";

// Common icon interface
interface IconProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  color?:
    | "blue"
    | "green"
    | "red"
    | "yellow"
    | "purple"
    | "indigo"
    | "orange"
    | "gray"
    | "current";
}

const getIconSize = (size: IconProps["size"] = "md") => {
  switch (size) {
    case "sm":
      return "icon-sm";
    case "md":
      return "icon-md";
    case "lg":
      return "icon-lg";
    case "xl":
      return "icon-xl";
    default:
      return "icon-md";
  }
};

const getIconColor = (color: IconProps["color"] = "current") => {
  switch (color) {
    case "blue":
      return "text-blue-600 dark:text-blue-400";
    case "green":
      return "text-green-600 dark:text-green-400";
    case "red":
      return "text-red-600 dark:text-red-400";
    case "yellow":
      return "text-yellow-600 dark:text-yellow-400";
    case "purple":
      return "text-purple-600 dark:text-purple-400";
    case "indigo":
      return "text-indigo-600 dark:text-indigo-400";
    case "orange":
      return "text-orange-600 dark:text-orange-400";
    case "gray":
      return "text-gray-600 dark:text-gray-400";
    case "current":
    default:
      return "text-current";
  }
};

// Clock Icon - Used for time tracking
export const ClockIcon = ({ className = "", size, color }: IconProps) => (
  <svg
    className={`${getIconSize(size)} ${getIconColor(color)} ${className}`}
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
);

// Chart/Statistics Icon
export const ChartIcon = ({ className = "", size, color }: IconProps) => (
  <svg
    className={`${getIconSize(size)} ${getIconColor(color)} ${className}`}
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
);

// Tag/Label Icon
export const TagIcon = ({ className = "", size, color }: IconProps) => (
  <svg
    className={`${getIconSize(size)} ${getIconColor(color)} ${className}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
    />
  </svg>
);

// Check Circle Icon - For completed items
export const CheckCircleIcon = ({ className = "", size, color }: IconProps) => (
  <svg
    className={`${getIconSize(size)} ${getIconColor(color)} ${className}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

// Trending Up Icon - For max/high values
export const TrendingUpIcon = ({ className = "", size, color }: IconProps) => (
  <svg
    className={`${getIconSize(size)} ${getIconColor(color)} ${className}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
    />
  </svg>
);

// Trending Down Icon - For min/low values
export const TrendingDownIcon = ({
  className = "",
  size,
  color,
}: IconProps) => (
  <svg
    className={`${getIconSize(size)} ${getIconColor(color)} ${className}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
    />
  </svg>
);

// Hash Icon - For counts/entries
export const HashIcon = ({ className = "", size, color }: IconProps) => (
  <svg
    className={`${getIconSize(size)} ${getIconColor(color)} ${className}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
    />
  </svg>
);

// Close/X Icon - For dismiss actions
export const XIcon = ({ className = "", size, color }: IconProps) => (
  <svg
    className={`${getIconSize(size)} ${getIconColor(color)} ${className}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

// Collection Icon - For groups/collections
export const CollectionIcon = ({ className = "", size, color }: IconProps) => (
  <svg
    className={`${getIconSize(size)} ${getIconColor(color)} ${className}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
    />
  </svg>
);

// Warning Triangle Icon
export const WarningIcon = ({ className = "", size, color }: IconProps) => (
  <svg
    className={`${getIconSize(size)} ${getIconColor(color)} ${className}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.99-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
    />
  </svg>
);

// Edit Icon
export const EditIcon = ({ className = "", size, color }: IconProps) => (
  <svg
    className={`${getIconSize(size)} ${getIconColor(color)} ${className}`}
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
);

// Delete/Trash Icon
export const TrashIcon = ({ className = "", size, color }: IconProps) => (
  <svg
    className={`${getIconSize(size)} ${getIconColor(color)} ${className}`}
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
);

// Currency/Dollar Icon - For financial data
export const CurrencyIcon = ({ className = "", size, color }: IconProps) => (
  <svg
    className={`${getIconSize(size)} ${getIconColor(color)} ${className}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
    />
  </svg>
);

// Beaker/Flask Icon - For fuel/liquids
export const BeakerIcon = ({ className = "", size, color }: IconProps) => (
  <svg
    className={`${getIconSize(size)} ${getIconColor(color)} ${className}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
    />
  </svg>
);

// Car Icon - For vehicles
export const CarIcon = ({ className = "", size, color }: IconProps) => (
  <svg
    className={`${getIconSize(size)} ${getIconColor(color)} ${className}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 12h14l-1.5-4.5h-11L5 12zm14 0v5h-2m-10 0H5v-5m2 5a2 2 0 110-4 2 2 0 010 4zm10 0a2 2 0 110-4 2 2 0 010 4z"
    />
  </svg>
);

// Users/Share Icon - For sharing features
export const UsersIcon = ({ className = "", size, color }: IconProps) => (
  <svg
    className={`${getIconSize(size)} ${getIconColor(color)} ${className}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
    />
  </svg>
);
