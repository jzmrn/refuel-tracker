import { ReactNode } from "react";

export type PanelProps = {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
};

export default function Panel({ title, actions, children }: PanelProps) {
  return (
    <div className="panel">
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-4 min-h-[44px]">
          {title && <h2 className="heading-2">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}
