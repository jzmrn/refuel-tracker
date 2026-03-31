import React from "react";
import { clsx } from "clsx";

const maxWidthClasses = {
  "4xl": "max-w-4xl",
  "7xl": "max-w-7xl",
} as const;

interface PageContainerProps {
  children: React.ReactNode;
  maxWidth?: keyof typeof maxWidthClasses;
}

export default function PageContainer({
  children,
  maxWidth = "7xl",
}: PageContainerProps) {
  return (
    <div
      className={clsx(
        maxWidthClasses[maxWidth],
        "mx-auto px-2 md:px-4 py-4 md:py-8",
      )}
    >
      {children}
    </div>
  );
}
