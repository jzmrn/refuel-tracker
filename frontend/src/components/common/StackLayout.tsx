import React from "react";

interface StackLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const StackLayout: React.FC<StackLayoutProps> = ({
  children,
  className = "",
}) => {
  return (
    <div className={`space-y-2 md:space-y-3 ${className}`}>{children}</div>
  );
};
