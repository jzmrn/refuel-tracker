import React from "react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import IconButton from "./IconButton";
import { useTranslation } from "@/lib/i18n/LanguageContext";

interface PageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  onBack?: () => void;
  backLabel?: string;
}

export default function PageHeader({
  title,
  subtitle,
  actions,
  onBack,
  backLabel,
}: PageHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="mb-6 md:mb-8">
      <div className="flex items-center gap-4">
        {onBack && (
          <IconButton
            onClick={onBack}
            icon={
              <ArrowBackIcon className="icon text-gray-600 dark:text-gray-400" />
            }
            ariaLabel={backLabel ?? t.common.back}
          />
        )}
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h1 className="heading-1">{title}</h1>
            {actions && <div className="flex gap-2">{actions}</div>}
          </div>
          {subtitle && (
            <p className="text-secondary mt-1 text-sm md:text-base">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
