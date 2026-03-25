import React from "react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import IconButton from "./IconButton";
import { useTranslation } from "@/lib/i18n/LanguageContext";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
}

export default function PageHeader({
  title,
  subtitle,
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
          <h1 className="heading-1">{title}</h1>
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
