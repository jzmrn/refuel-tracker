import { useTranslation } from "@/lib/i18n/LanguageContext";
import EmptyState from "@/components/common/EmptyState";

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
    <div className="space-y-6">
      <EmptyState
        icon="📊"
        title={t.fuelPrices.statistics}
        subtitle={t.fuelPrices.statisticsDescription}
      />

      <div className="panel p-6">
        <p className="text-secondary text-center">
          {t.fuelPrices.priceComparison} - Coming soon...
        </p>
      </div>
    </div>
  );
}
