import React from "react";
import AddIcon from "@mui/icons-material/Add";
import BarChartIcon from "@mui/icons-material/BarChart";
import Panel from "@/components/common/Panel";
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
        <div className="flex gap-2">
          <button
            onClick={onViewChart}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={t.kilometers.viewChart}
          >
            <BarChartIcon className="icon text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={onAddEntry}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={t.navigation.addEntry}
          >
            <AddIcon className="icon text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      }
    >
      <KilometerList entries={entries} loading={loading} />
    </Panel>
  );
};

export default RecentKilometersPanel;
