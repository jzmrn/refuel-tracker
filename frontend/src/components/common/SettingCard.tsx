import { ReactNode } from "react";
import Panel from "./Panel";

interface SettingCardProps {
  title: string;
  description: string;
  children: ReactNode;
}

export default function SettingCard({
  title,
  description,
  children,
}: SettingCardProps) {
  return (
    <Panel
      title={title}
      subtitle={<p className="text-secondary text-sm">{description}</p>}
      actions={<div className="flex-shrink-0">{children}</div>}
      noHeaderMargin
    />
  );
}
