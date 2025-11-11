import React from "react";

interface EmptyStateProps {
  /** The icon React component to display */
  icon: React.ReactNode;
  /** Main title text */
  title: string;
  /** Optional subtitle/description text */
  subtitle?: string;
  /** Additional CSS classes */
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  subtitle,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`panel flex flex-col items-center justify-center py-12 ${className}`}
    >
      <div className="flex flex-col items-center gap-2">
        {icon}
        <p className="text-lg text-secondary text-center font-medium mb-2">
          {title}
        </p>
        {subtitle && (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-1">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
