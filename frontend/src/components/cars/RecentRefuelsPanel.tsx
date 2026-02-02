import React from "react";
import AddIcon from "@mui/icons-material/Add";
import BarChartIcon from "@mui/icons-material/BarChart";
import Panel from "@/components/common/Panel";
import RefuelList from "@/components/refuels/RefuelList";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { RefuelMetric } from "@/lib/api";

interface RecentRefuelsPanelProps {
  refuels: RefuelMetric[];
  loading: boolean;
  onViewStats: () => void;
  onAddRefuel: () => void;
}

const RecentRefuelsPanel: React.FC<RecentRefuelsPanelProps> = ({
  refuels,
  loading,
  onViewStats,
  onAddRefuel,
}) => {
  const { t } = useTranslation();

  return (
    <Panel
      title={t.refuels.recentRefuels}
      actions={
        <div className="flex gap-2">
          <button
            onClick={onViewStats}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={t.refuels.viewStatistics}
          >
            <BarChartIcon className="icon text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={onAddRefuel}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={t.navigation.addEntry}
          >
            <AddIcon className="icon text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      }
    >
      <RefuelList refuels={refuels} loading={loading} />
    </Panel>
  );
};

export default RecentRefuelsPanel;
