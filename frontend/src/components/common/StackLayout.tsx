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
    <div className={`space-y-2 xs:space-y-3 md:space-y-4 ${className}`}>
      {children}
    </div>
  );
};
