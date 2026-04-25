import React, { Suspense, useState, useEffect, startTransition } from "react";
import type { FuelType } from "@/lib/api";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useFuelType } from "@/lib/fuelType";
import { useStationMeta } from "@/lib/hooks/useFuelPrices";
import {
  useStationDailyPrices,
  useStationComparison,
  useStationDailyStatsByDays,
} from "@/lib/hooks/useStats";
import { StandardCard, StackLayout } from "@/components/common";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { FilterPanel, FilterRow } from "@/components/common";
import FuelTypeSelector from "@/components/fuel/FuelTypeSelector";
import DailyPriceChangesChart from "@/components/fuel/DailyPriceChangesChart";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import LocalGasStationIcon from "@mui/icons-material/LocalGasStation";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import TimelineIcon from "@mui/icons-material/Timeline";
import StationAllFuelsDailyChart from "./StationAllFuelsDailyChart";
import StationComparisonChart from "./StationComparisonChart";
import { COMPARISON_TYPE_COLORS } from "./chartUtils";

const DAYS_OPTIONS = [30, 60, 90] as const;

const FUEL_TYPE_LABELS: Record<FuelType, string> = {
  e5: "Super E5",
  e10: "Super E10",
  diesel: "Diesel",
};

interface StationStatsContentProps {
  stationId: string;
}

function DaysSelector({
  selectedDays,
  onDaysChange,
  className = "",
}: {
  selectedDays: number;
  onDaysChange: (days: number) => void;
  className?: string;
}) {
  const { t } = useTranslation();

  const labels: Record<number, string> = {
    30: t.statistics.last30Days,
    60: t.statistics.last60Days,
    90: t.statistics.last90Days,
  };

  return (
    <div className={`grid grid-cols-1 xs:grid-cols-3 gap-2 ${className}`}>
      {DAYS_OPTIONS.map((days) => (
        <button
          key={days}
          onClick={() => onDaysChange(days)}
          className={
            selectedDays === days ? "btn-toggle-active" : "btn-toggle-inactive"
          }
        >
          {labels[days]}
        </button>
      ))}
    </div>
  );
}

function ComparisonLegend({
  entries,
}: {
  entries: { key: string; label: string }[];
}) {
  return (
    <div className="flex flex-wrap justify-center gap-x-5 gap-y-1.5 px-3 py-2">
      {entries.map((entry) => (
        <div key={entry.key} className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-0.5 shrink-0"
            style={{ backgroundColor: COMPARISON_TYPE_COLORS[entry.key] }}
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {entry.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function StationStatsCharts({
  stationId,
  selectedFuelType,
  selectedDays,
}: {
  stationId: string;
  selectedFuelType: FuelType;
  selectedDays: number;
}) {
  const { t } = useTranslation();

  const { data: stationMeta } = useStationMeta(stationId);
  const { data: dailyPrices } = useStationDailyPrices(stationId, selectedDays);
  const { data: comparison } = useStationComparison(
    stationId,
    selectedFuelType,
    selectedDays,
  );
  const { data: dailyStats } = useStationDailyStatsByDays(
    stationId,
    selectedFuelType,
    selectedDays,
  );

  // Build distinct legend labels from station meta
  // Format: "<brand> <place> (Station)", "<place> (City)", "<brand> (Brand)"
  const brandName = stationMeta?.brand || comparison.brand.label;
  const placeName = stationMeta?.place || comparison.place.label;

  const stationDisplayLabel = `${brandName} ${placeName} (${t.statistics.stationLegendSuffix})`;
  const placeDisplayLabel = `${placeName} (${t.statistics.cityLegendSuffix})`;
  const brandDisplayLabel = `${brandName} (${t.statistics.brandLegendSuffix})`;

  // Use fixed type keys for consistent colors
  const labelMap: Record<string, string> = {
    station: stationDisplayLabel,
    place: placeDisplayLabel,
    brand: brandDisplayLabel,
  };

  const legendEntries = [
    { key: "station", label: stationDisplayLabel },
    { key: "place", label: placeDisplayLabel },
    { key: "brand", label: brandDisplayLabel },
  ].filter((e) =>
    e.key === "station"
      ? comparison.station.data.length > 0
      : e.key === "place"
      ? comparison.place.data.length > 0
      : comparison.brand.data.length > 0,
  );

  return (
    <>
      <StandardCard
        title={t.statistics.dailyPriceAllFuels}
        icon={
          <LocalGasStationIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        }
        iconBackground="purple"
      >
        <StationAllFuelsDailyChart data={dailyPrices.days} />
      </StandardCard>

      <StandardCard
        title={t.statistics.stationVsPlaceVsBrand}
        icon={
          <CompareArrowsIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
        }
        iconBackground="orange"
      >
        <StationComparisonChart data={comparison} labelMap={labelMap} />
        {legendEntries.length > 0 && (
          <ComparisonLegend entries={legendEntries} />
        )}
      </StandardCard>

      <StandardCard
        title={t.fuelPrices.priceActivity}
        icon={
          <TimelineIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        }
        iconBackground="indigo"
      >
        <DailyPriceChangesChart data={dailyStats?.daily_stats ?? []} />
      </StandardCard>
    </>
  );
}

const StationStatsContent: React.FC<StationStatsContentProps> = ({
  stationId,
}) => {
  const { t } = useTranslation();
  const { fuelType: selectedFuelType, setFuelType: setSelectedFuelType } =
    useFuelType();
  const [selectedDays, setSelectedDays] = useState<number>(90);

  const storageKey = "stationStats.days";

  useEffect(() => {
    startTransition(() => {
      const stored = localStorage.getItem(storageKey);
      if (stored === "30" || stored === "60" || stored === "90") {
        setSelectedDays(parseInt(stored, 10));
      }
    });
  }, []);

  const handleDaysChange = (days: number) => {
    setSelectedDays(days);
    localStorage.setItem(storageKey, String(days));
  };

  const daysLabels: Record<number, string> = {
    30: t.statistics.last30Days,
    60: t.statistics.last60Days,
    90: t.statistics.last90Days,
  };

  const collapsedSummary = [
    FUEL_TYPE_LABELS[selectedFuelType],
    daysLabels[selectedDays] ?? `${selectedDays}d`,
  ];

  return (
    <StackLayout>
      <FilterPanel
        icon={
          <FilterAltIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        }
        title={t.statistics.filters}
        collapsedSummary={collapsedSummary}
      >
        <FilterRow label={t.statistics.selectFuelType}>
          <FuelTypeSelector
            selectedFuelType={selectedFuelType}
            onFuelTypeChange={setSelectedFuelType}
          />
        </FilterRow>
        <FilterRow label={t.statistics.timeRange}>
          <DaysSelector
            selectedDays={selectedDays}
            onDaysChange={handleDaysChange}
          />
        </FilterRow>
      </FilterPanel>

      <Suspense fallback={<LoadingSpinner />}>
        <StationStatsCharts
          stationId={stationId}
          selectedFuelType={selectedFuelType}
          selectedDays={selectedDays}
        />
      </Suspense>
    </StackLayout>
  );
};

export default StationStatsContent;
