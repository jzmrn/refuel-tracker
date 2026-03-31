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
    <div className={`space-y-3 xs:space-y-4 md:space-y-5 ${className}`}>
      {children}
    </div>
  );
};
