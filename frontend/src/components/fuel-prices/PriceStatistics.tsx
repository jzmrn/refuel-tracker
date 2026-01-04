import { useTranslation } from "@/lib/i18n/LanguageContext";
import Panel from "@/components/common/Panel";
import EmptyPanel from "@/components/common/EmptyPanel";
import BarChartIcon from "@mui/icons-material/BarChart";
import { LoadingSpinner } from "../common";

interface PriceStatisticsProps {
  loading: boolean;
}

export default function PriceStatistics({ loading }: PriceStatisticsProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <Panel>
        <LoadingSpinner text={t.common.loading} />
      </Panel>
    );
  }

  return (
    <EmptyPanel
      icon={
        <BarChartIcon className="icon-xl text-gray-600 dark:text-gray-400 mx-auto mb-4" />
      }
      title={t.common.noStatistics}
      className="empty-state"
    />
  );
}
