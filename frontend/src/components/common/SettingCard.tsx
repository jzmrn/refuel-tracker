import React, { ReactNode } from "react";

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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {title}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            {description}
          </p>
        </div>
        <div className="flex-shrink-0">{children}</div>
      </div>
    </div>
  );
}
