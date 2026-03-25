import React from "react";
import AddIcon from "@mui/icons-material/Add";
import BarChartIcon from "@mui/icons-material/BarChart";
import Panel from "@/components/common/Panel";
import { IconButton } from "@/components/common";
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
          <IconButton
            onClick={onViewStats}
            icon={
              <BarChartIcon className="icon text-gray-600 dark:text-gray-400" />
            }
            ariaLabel={t.refuels.viewStatistics}
          />
          <IconButton
            onClick={onAddRefuel}
            icon={<AddIcon className="icon text-gray-600 dark:text-gray-400" />}
            ariaLabel={t.navigation.addEntry}
          />
        </div>
      }
    >
      <RefuelList refuels={refuels} loading={loading} />
    </Panel>
  );
};

export default RecentRefuelsPanel;
