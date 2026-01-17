import CircularProgress from "@mui/material/CircularProgress";
import { useTranslation } from "@/lib/i18n/LanguageContext";

interface ChartLoadingFallbackProps {
  className?: string;
}

export default function ChartLoadingFallback({
  className = "",
}: ChartLoadingFallbackProps) {
  const { t } = useTranslation();

  return (
    <div
      className={`panel flex flex-col items-center justify-center py-12 ${className}`}
    >
      <CircularProgress size={24} />
      <span className="text-secondary mt-3 text-sm">{t.common.loading}</span>
    </div>
  );
}
