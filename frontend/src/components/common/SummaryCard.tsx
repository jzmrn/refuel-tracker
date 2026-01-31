import React from "react";

export interface ValueUnit {
  value: number | null;
  unit?: string;
  formatter?: (value: number) => React.ReactNode;
}

interface SummaryCardProps {
  title: string;
  value: ValueUnit | ValueUnit[];
  icon: React.ReactNode;
  iconBgColor?:
    | "blue"
    | "green"
    | "purple"
    | "yellow"
    | "red"
    | "indigo"
    | "orange"
    | "gray";
  loading?: boolean;
}

export default function SummaryCard({
  title,
  value,
  icon,
  iconBgColor = "blue",
  loading = false,
}: SummaryCardProps) {
  return (
    <div className="card relative border-0">
      <div
        className={`icon-xl rounded-lg flex-center justify-center ml-4 mr-3 flex-shrink-0 icon-bg-${iconBgColor}`}
        style={{
          position: "absolute",
          left: 0,
          top: "50%",
          transform: "translateY(-50%)",
        }}
      >
        {icon}
      </div>
      <div className="flex flex-col space-y-1 min-w-0 flex-1 pl-14">
        <p className="text-sm font-medium text-secondary">{title}</p>
        <p className="text-value">
          {loading ? (
            "..."
          ) : (
            <span className="flex flex-wrap gap-1">
              {(Array.isArray(value) ? value : [value]).map((item, index) => (
                <span key={index} className="flex items-baseline mr-2">
                  {item.value !== null
                    ? item.formatter
                      ? item.formatter(item.value)
                      : item.value
                    : "-"}
                  {item.unit && (
                    <span className="text-sm font-medium text-secondary ml-1">
                      {item.unit}
                    </span>
                  )}
                </span>
              ))}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
