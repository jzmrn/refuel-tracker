import { useTranslation } from "@/lib/i18n/LanguageContext";
import EmptyState from "@/components/common/EmptyState";
import BarChartIcon from "@mui/icons-material/BarChart";
import { LoadingSpinner } from "../common";

interface PriceStatisticsProps {
  loading: boolean;
}

export default function PriceStatistics({ loading }: PriceStatisticsProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="panel">
        <LoadingSpinner text={t.common.loading} />
      </div>
    );
  }

  return (
    <EmptyState
      icon={
        <BarChartIcon className="icon-xl text-gray-600 dark:text-gray-400 mx-auto mb-4" />
      }
      title={t.common.noStatistics}
      className="empty-state"
    />
  );
}
