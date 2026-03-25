import React from "react";
import { clsx } from "clsx";

interface IconButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
}

export default function IconButton({
  onClick,
  icon,
  ariaLabel,
  disabled = false,
  className,
}: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "p-2 rounded-lg transition-colors",
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "hover:bg-gray-100 dark:hover:bg-gray-700",
        className,
      )}
      aria-label={ariaLabel}
    >
      {icon}
    </button>
  );
}
