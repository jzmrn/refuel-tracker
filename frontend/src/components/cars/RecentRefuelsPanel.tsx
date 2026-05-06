import React from "react";
import AddIcon from "@mui/icons-material/Add";
import BarChartIcon from "@mui/icons-material/BarChart";
import ListIcon from "@mui/icons-material/List";
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
  onViewAll: () => void;
  onEditRefuel: (refuel: RefuelMetric) => void;
}

const RecentRefuelsPanel: React.FC<RecentRefuelsPanelProps> = ({
  refuels,
  loading,
  onViewStats,
  onAddRefuel,
  onViewAll,
  onEditRefuel,
}) => {
  const { t } = useTranslation();

  return (
    <Panel
      title={t.refuels.recentRefuels}
      actions={
        <div className="flex gap-2">
          <IconButton
            onClick={onViewAll}
            icon={
              <ListIcon className="icon text-gray-600 dark:text-gray-400" />
            }
            ariaLabel={t.navigation.showAll}
          />
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
      <RefuelList
        refuels={refuels}
        loading={loading}
        onRowClick={onEditRefuel}
      />
    </Panel>
  );
};

export default RecentRefuelsPanel;
