import React from "react";

interface GridLayoutProps {
  children: React.ReactNode;
  variant?: "stats" | "cards" | "list" | "auto";
  className?: string;
}

export const GridLayout: React.FC<GridLayoutProps> = ({
  children,
  variant = "stats",
  className = "",
}) => {
  const getGridClasses = (variant: string) => {
    switch (variant) {
      case "stats":
        return "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4";
      case "cards":
        return "grid grid-cols-1 md:grid-cols-2 gap-6";
      case "list":
        return "grid grid-cols-1 gap-4";
      case "auto":
        return "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4";
      default:
        return "grid grid-cols-2 gap-4";
    }
  };

  return (
    <div className={`${getGridClasses(variant)} ${className}`}>{children}</div>
  );
};
