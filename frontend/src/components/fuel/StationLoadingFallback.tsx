import CircularProgress from "@mui/material/CircularProgress";
import { useTranslation } from "@/lib/i18n/LanguageContext";

interface StationLoadingFallbackProps {
  className?: string;
}

export default function StationLoadingFallback({
  className = "",
}: StationLoadingFallbackProps) {
  const { t } = useTranslation();

  return (
    <div className={`panel text-center py-8 ${className}`}>
      <div className="flex flex-col items-center gap-2">
        <CircularProgress size={20} />
        <span className="text-secondary">{t.common.loading}</span>
      </div>
    </div>
  );
}
