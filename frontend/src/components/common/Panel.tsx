import { ReactNode } from "react";

export type PanelProps = {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
};

export default function Panel({
  title,
  subtitle,
  actions,
  children,
}: PanelProps) {
  return (
    <div className="panel">
      {(title || subtitle || actions) && (
        <div className="mb-4 flex items-center justify-between gap-4 min-h-[44px]">
          <div>
            {title && <h2 className="heading-2">{title}</h2>}
            {subtitle && <div className="mt-1">{subtitle}</div>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}
