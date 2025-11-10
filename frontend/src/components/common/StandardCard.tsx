import React from "react";

interface StandardCardProps {
  title?: string;
  icon?: React.ReactNode;
  iconBackground?:
    | "blue"
    | "green"
    | "yellow"
    | "red"
    | "purple"
    | "indigo"
    | "orange"
    | "gray";
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
}

export const StandardCard: React.FC<StandardCardProps> = ({
  title,
  icon,
  iconBackground = "blue",
  children,
  className = "",
  headerAction,
}) => {
  return (
    <div className={`card ${className}`}>
      {(title || icon || headerAction) && (
        <div className="flex-between mb-4">
          <div className="flex-center gap-3">
            {icon && (
              <div className={`p-2 rounded-lg icon-bg-${iconBackground}`}>
                {icon}
              </div>
            )}
            {title && <h3 className="heading-3">{title}</h3>}
          </div>
          {headerAction}
        </div>
      )}
      {children}
    </div>
  );
};
