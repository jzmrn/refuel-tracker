import { useTranslation } from "@/lib/i18n/LanguageContext";
import EmptyState from "@/components/common/EmptyState";
import { ChartIcon } from "../common";

interface PriceStatisticsProps {
  loading: boolean;
}

export default function PriceStatistics({ loading }: PriceStatisticsProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="loading-spinner-container">
        <div className="loading-spinner"></div>
        <p className="text-secondary mt-2">{t.common.loading}</p>
      </div>
    );
  }

  return (
    <EmptyState
      icon={<ChartIcon size="xl" color="gray" className="mx-auto mb-4" />}
      title={t.common.noStatistics}
      className="empty-state"
    />
  );
}
