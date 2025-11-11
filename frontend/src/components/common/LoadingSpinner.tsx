import React from "react";
import { useTranslation } from "@/lib/i18n/LanguageContext";

interface LoadingSpinnerProps {
  text?: string;
  className?: string;
}

export default function LoadingSpinner({
  text,
  className = "",
}: LoadingSpinnerProps) {
  const { t } = useTranslation();
  const displayText = text || t.common.loading;

  return (
    <div className={`loading-state ${className}`}>
      <div className="spinner"></div>
      <span className="text">{displayText}</span>
    </div>
  );
}
