import { ComponentType, ReactNode } from "react";

type IconColor =
  | "blue"
  | "green"
  | "yellow"
  | "red"
  | "purple"
  | "indigo"
  | "orange"
  | "gray";

const ICON_COLOR_CLASS: Record<IconColor, string> = {
  blue: "text-blue-600 dark:text-blue-400",
  green: "text-green-600 dark:text-green-400",
  yellow: "text-yellow-600 dark:text-yellow-400",
  red: "text-red-600 dark:text-red-400",
  purple: "text-purple-600 dark:text-purple-400",
  indigo: "text-indigo-600 dark:text-indigo-400",
  orange: "text-orange-600 dark:text-orange-400",
  gray: "text-gray-600 dark:text-gray-400",
};

export type PanelProps = {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  iconBackground?: IconColor;
  variant?: "default" | "compact";
  className?: string;
  noHeaderMargin?: boolean;
  children?: ReactNode;
};

export default function Panel({
  title,
  subtitle,
  actions,
  icon: Icon,
  iconBackground = "gray",
  variant = "default",
  className = "",
  noHeaderMargin = false,
  children,
}: PanelProps) {
  const isCompact = variant === "compact";
  const rootClass = isCompact ? "card" : "panel";
  // compact = tighter ".card" surface with an h3 heading and a plain header row;
  // default = roomier ".panel" surface with an h2 heading and a min-height header.
  const headerClass = isCompact
    ? "flex items-center justify-between"
    : "flex items-center justify-between gap-4 min-h-[44px]";

  const hasHeader = title || subtitle || Icon || actions;

  return (
    <div className={`${rootClass} ${className}`.trim()}>
      {hasHeader && (
        <div
          className={`${headerClass}${
            !noHeaderMargin && children ? " mb-4" : ""
          }`}
        >
          <div className="flex items-center gap-3">
            {Icon && (
              <div className={`p-2 rounded-lg icon-bg-${iconBackground}`}>
                <Icon
                  className={`w-5 h-5 ${ICON_COLOR_CLASS[iconBackground]}`}
                />
              </div>
            )}
            <div>
              {title &&
                (isCompact ? (
                  <h3 className="heading-3">{title}</h3>
                ) : (
                  <h2 className="heading-2">{title}</h2>
                ))}
              {subtitle && <div className="mt-1">{subtitle}</div>}
            </div>
          </div>
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}
