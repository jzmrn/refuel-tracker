import React from "react";

interface ActionBarProps {
  title: string;
  actions?: React.ReactNode;
  className?: string;
}

export default function ActionBar({
  title,
  actions,
  className = "",
}: ActionBarProps) {
  return (
    <div className={`flex justify-between items-center mb-4 ${className}`}>
      <h2 className="heading-2">{title}</h2>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}
