import React from "react";
import AddIcon from "@mui/icons-material/Add";
import BarChartIcon from "@mui/icons-material/BarChart";
import Panel from "@/components/common/Panel";
import { IconButton } from "@/components/common";
import KilometerList from "@/components/refuels/KilometerList";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { KilometerEntry } from "@/lib/api";

interface RecentKilometersPanelProps {
  entries: KilometerEntry[];
  loading: boolean;
  onViewChart: () => void;
  onAddEntry: () => void;
}

const RecentKilometersPanel: React.FC<RecentKilometersPanelProps> = ({
  entries,
  loading,
  onViewChart,
  onAddEntry,
}) => {
  const { t } = useTranslation();

  return (
    <Panel
      title={t.kilometers.recentEntries}
      actions={
        <div className="action-group">
          <IconButton
            onClick={onViewChart}
            icon={
              <BarChartIcon className="icon text-gray-600 dark:text-gray-400" />
            }
            ariaLabel={t.kilometers.viewChart}
          />
          <IconButton
            onClick={onAddEntry}
            icon={<AddIcon className="icon text-gray-600 dark:text-gray-400" />}
            ariaLabel={t.navigation.addEntry}
          />
        </div>
      }
    >
      <KilometerList entries={entries} loading={loading} />
    </Panel>
  );
};

export default RecentKilometersPanel;
