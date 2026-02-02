import React from "react";
import Panel from "@/components/common/Panel";
import { EmptyPanel, LoadingSpinner } from "@/components/common";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import KilometerChart from "./KilometerChart";
import CloseIcon from "@mui/icons-material/Close";

interface ChartDataPoint {
  timestamp: number;
  total_kilometers: number;
  displayDate: string;
}

interface KilometerStatsContentProps {
  chartData: ChartDataPoint[];
  isLoading: boolean;
  isError: boolean;
}

const KilometerStatsContent: React.FC<KilometerStatsContentProps> = ({
  chartData,
  isLoading,
  isError,
}) => {
  const { t } = useTranslation();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (isError) {
    return (
      <EmptyPanel
        icon={
          <CloseIcon className="icon-xl text-gray-400 dark:text-gray-500 mb-3" />
        }
        title={t.common.errorLoadingData}
      />
    );
  }

  if (chartData.length === 0) {
    return (
      <Panel title={t.kilometers.kilometerHistory}>
        <div className="empty-state">
          <p>{t.kilometers.noEntriesYet}</p>
          <p className="text-sm mt-1">{t.kilometers.addFirstEntry}</p>
        </div>
      </Panel>
    );
  }

  return (
    <Panel title={t.kilometers.kilometerHistory}>
      <KilometerChart data={chartData} />
    </Panel>
  );
};

export default KilometerStatsContent;
