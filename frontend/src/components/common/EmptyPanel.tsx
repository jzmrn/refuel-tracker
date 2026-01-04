import React from "react";
import EmptyState from "./EmptyState";

interface EmptyPanelProps {
  /** The icon React component to display */
  icon: React.ReactNode;
  /** Main title text */
  title: string;
  /** Optional subtitle/description text */
  subtitle?: string;
  /** Additional CSS classes */
  className?: string;
}

export default function EmptyPanel({
  icon,
  title,
  subtitle,
  className = "",
}: EmptyPanelProps) {
  return (
    <div
      className={`panel flex flex-col items-center justify-center py-12 ${className}`}
    >
      <EmptyState icon={icon} title={title} subtitle={subtitle} />
    </div>
  );
}
