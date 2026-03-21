import React from "react";
import Panel from "@/components/common/Panel";
import { useLocalization, useTranslation } from "@/lib/i18n/LanguageContext";
import KilometerChart from "./KilometerChart";
import { useCar, useKilometerEntries } from "@/lib/hooks/useCars";

interface ChartDataPoint {
  timestamp: number;
  total_kilometers: number;
  displayDate: string;
}

interface KilometerStatsContentProps {
  carId: string;
  filterDates: { start_date?: string };
}

const KilometerStatsContent: React.FC<KilometerStatsContentProps> = ({
  carId,
  filterDates,
}) => {
  const { t } = useTranslation();
  const { formatDate } = useLocalization();

  const { data: kilometerEntries } = useKilometerEntries(carId, {
    ...filterDates,
    limit: 1000,
  });

  // Prepare chart data - sort by timestamp ascending for the chart
  const chartData = [...kilometerEntries]
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    )
    .map((entry) => ({
      timestamp: new Date(entry.timestamp).getTime(),
      total_kilometers: entry.total_kilometers,
      displayDate: formatDate(new Date(entry.timestamp), {
        month: "short",
        day: "numeric",
        year: "2-digit",
      }),
    }));

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
