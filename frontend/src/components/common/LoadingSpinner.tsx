import React from "react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import CircularProgress from "node_modules/@mui/material/esm/CircularProgress/CircularProgress";

interface LoadingSpinnerProps {
  text?: string;
  className?: string;
}

export default function LoadingSpinner({ text }: LoadingSpinnerProps) {
  const { t } = useTranslation();
  const displayText = text || t.common.loading;

  return (
    <div className="flex items-center justify-center gap-3 py-12">
      <CircularProgress size={24} />
      <span className="text-secondary">{displayText}</span>
    </div>
  );
}
