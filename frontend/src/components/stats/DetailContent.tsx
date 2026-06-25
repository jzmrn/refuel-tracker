import React, {
  Suspense,
  useState,
  useEffect,
  startTransition,
  useMemo,
  useCallback,
} from "react";
import { FuelType } from "@/lib/api";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useFuelType } from "@/lib/fuelType";
import { useFavoriteEntities } from "@/lib/hooks/useStats";
import { FilterMultiSelectOption } from "@/components/common/FilterMultiSelect";
import {
  Panel,
  StackLayout,
  FilterPanel,
  FilterRow,
} from "@/components/common";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import FuelTypeSelector from "@/components/fuel/FuelTypeSelector";
import TimeRangeSelector from "@/components/stats/TimeRangeSelector";
import AvgPriceChart from "@/components/stats/AvgPriceChart";
import VarianceChart from "@/components/stats/VarianceChart";
import PriceActivityChart from "@/components/stats/PriceActivityChart";
import PriceDirectionChart, {
  hasPriceDirectionData,
} from "@/components/stats/PriceDirectionChart";
import {
  DetailAggregate,
  InteractiveLegend,
  buildColorMap,
} from "@/components/stats/chartUtils";
import PlaceIcon from "@mui/icons-material/Place";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import LocalGasStationIcon from "@mui/icons-material/LocalGasStation";
import BusinessIcon from "@mui/icons-material/Business";

interface ChartLabels {
  avgPrice: string;
  variance: string;
  activity: string;
  priceIncreased: string;
  priceDecreased: string;
}

export type EntityType = "station" | "brand" | "place";
export type DetailDataSourceMode = "favourites" | "all";

interface DetailContentProps<T> {
  storageKeyPrefix: string;
  entityType: EntityType;
  useDetailData: (
    fuelType: FuelType,
    months: number,
    entityFilter?: string[],
  ) => { data: T[] };
  useAvailableEntities: () => { data: FilterMultiSelectOption[] };
  mapToDetail: (item: T) => DetailAggregate;
  chartLabels: ChartLabels;
}

/**
 * Inner component that fetches data and renders interactive legend + charts.
 * Mounted inside a <Suspense> boundary.
 */
function DetailCharts<T>({
  entityType,
  useDetailData,
  useAvailableEntities,
  mapToDetail,
  chartLabels,
  selectedFuelType,
  selectedMonths,
  dataSourceMode,
  enabledEntities,
  onEntitiesChanged,
}: {
  entityType: EntityType;
  useDetailData: DetailContentProps<T>["useDetailData"];
  useAvailableEntities: DetailContentProps<T>["useAvailableEntities"];
  mapToDetail: DetailContentProps<T>["mapToDetail"];
  chartLabels: ChartLabels;
  selectedFuelType: FuelType;
  selectedMonths: number;
  dataSourceMode: DetailDataSourceMode;
  enabledEntities: Set<string>;
  onEntitiesChanged: (entities: Set<string>, allEntities: string[]) => void;
}) {
  const { t } = useTranslation();
  const { data: favoriteEntities } = useFavoriteEntities();
  const { data: availableOptions } = useAvailableEntities();

  // Determine which entities to request from the backend
  const entityFilter = useMemo(() => {
    if (dataSourceMode === "favourites") {
      switch (entityType) {
        case "station":
          return favoriteEntities.station_ids;
        case "brand":
          return favoriteEntities.brands;
        case "place":
          return favoriteEntities.places;
      }
    }
    // "all" mode: request all available entities
    return availableOptions.map((o) => o.value);
  }, [dataSourceMode, entityType, favoriteEntities, availableOptions]);

  const { data: rawData } = useDetailData(
    selectedFuelType,
    selectedMonths,
    entityFilter.length > 0 ? entityFilter : undefined,
  );

  const detailData = useMemo(
    () => rawData.map(mapToDetail),
    [rawData, mapToDetail],
  );

  // All entities present in the fetched data
  const allEntities = useMemo(
    () => Array.from(new Set(detailData.map((d) => d.entity))).sort(),
    [detailData],
  );

  // Build a mapping from entity filter value (e.g., station_id) to display label
  // For brands/places the value IS the label; for stations the value is an ID
  // and the label is derived from mapToDetail (e.g., "Brand (Place)")
  const favouriteDisplayLabels = useMemo(() => {
    if (dataSourceMode !== "all") return new Set<string>();

    // Get the raw favourite IDs/values
    let favValues: string[];
    switch (entityType) {
      case "station":
        favValues = favoriteEntities.station_ids;
        break;
      case "brand":
        favValues = favoriteEntities.brands;
        break;
      case "place":
        favValues = favoriteEntities.places;
        break;
    }

    if (entityType === "station") {
      // For stations: map favourite station_ids → display labels via availableOptions
      const favIdSet = new Set(favValues);
      const labels = new Set<string>();
      for (const opt of availableOptions) {
        if (favIdSet.has(opt.value)) {
          labels.add(opt.label);
        }
      }
      return labels;
    }

    // For brands/places: value === display label
    return new Set(favValues);
  }, [dataSourceMode, entityType, favoriteEntities, availableOptions]);

  // On first render or mode switch: initialize enabled set if empty
  useEffect(() => {
    if (allEntities.length === 0) return;

    if (enabledEntities.size === 0) {
      // Enable all entities initially (favourites mode) or just favourites (all mode)
      if (dataSourceMode === "favourites") {
        onEntitiesChanged(new Set(allEntities), allEntities);
      } else {
        // In "all" mode, enable only entities that match favourites
        const favSet = new Set<string>();
        for (const entity of allEntities) {
          if (favouriteDisplayLabels.has(entity)) {
            favSet.add(entity);
          }
        }
        // If no favourites match, enable all to avoid blank chart
        onEntitiesChanged(
          favSet.size > 0 ? favSet : new Set(allEntities),
          allEntities,
        );
      }
    } else {
      // Entities changed (e.g., new data loaded) — keep existing enabled set,
      // just inform parent of current allEntities for persistence
      onEntitiesChanged(enabledEntities, allEntities);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allEntities.join(","), dataSourceMode]);

  // Filter data to only enabled entities for charts
  const visibleData = useMemo(
    () => detailData.filter((d) => enabledEntities.has(d.entity)),
    [detailData, enabledEntities],
  );

  const showPriceDirectionCharts = useMemo(
    () => hasPriceDirectionData(visibleData),
    [visibleData],
  );

  const handleToggle = useCallback(
    (entity: string) => {
      const next = new Set(enabledEntities);
      if (next.has(entity)) {
        // Don't allow disabling all — keep at least one
        if (next.size > 1) {
          next.delete(entity);
        }
      } else {
        next.add(entity);
      }
      onEntitiesChanged(next, allEntities);
    },
    [enabledEntities, onEntitiesChanged, allEntities],
  );

  // Build a stable color map from ALL entities (not just visible ones)
  // so colors stay consistent between legend and charts
  const colorMap = useMemo(() => buildColorMap(allEntities), [allEntities]);

  // Determine legend panel title and icon based on entity type
  const legendTitle = useMemo(() => {
    switch (entityType) {
      case "station":
        return t.statistics.dataSource.stations;
      case "brand":
        return t.statistics.dataSource.brands;
      case "place":
        return t.statistics.dataSource.places;
    }
  }, [entityType, t]);

  const LegendIcon = useMemo(() => {
    switch (entityType) {
      case "station":
        return LocalGasStationIcon;
      case "brand":
        return BusinessIcon;
      case "place":
        return PlaceIcon;
    }
  }, [entityType]);

  if (entityFilter.length === 0 && dataSourceMode === "favourites") {
    return (
      <div className="card text-center py-8">
        <p className="text-secondary">{t.statistics.dataSource.noFavourites}</p>
      </div>
    );
  }

  if (detailData.length === 0) {
    return (
      <div className="card text-center py-8">
        <p className="text-secondary">{t.statistics.noDataAvailable}</p>
      </div>
    );
  }

  return (
    <>
      <Panel
        variant="compact"
        title={legendTitle}
        icon={LegendIcon}
        iconBackground="gray"
      >
        <InteractiveLegend
          entities={allEntities}
          enabledEntities={enabledEntities}
          onToggle={handleToggle}
        />
      </Panel>

      {visibleData.length > 0 && (
        <>
          <Panel
            variant="compact"
            title={chartLabels.avgPrice}
            icon={PlaceIcon}
            iconBackground="orange"
          >
            <AvgPriceChart data={visibleData} colorMap={colorMap} />
          </Panel>

          <Panel
            variant="compact"
            title={chartLabels.variance}
            icon={TrendingDownIcon}
            iconBackground="purple"
          >
            <VarianceChart data={visibleData} colorMap={colorMap} />
          </Panel>

          {showPriceDirectionCharts ? (
            <>
              <Panel
                variant="compact"
                title={chartLabels.priceIncreased}
                icon={TrendingUpIcon}
                iconBackground="red"
              >
                <PriceDirectionChart
                  data={visibleData}
                  direction="increased"
                  colorMap={colorMap}
                />
              </Panel>

              <Panel
                variant="compact"
                title={chartLabels.priceDecreased}
                icon={TrendingDownIcon}
                iconBackground="green"
              >
                <PriceDirectionChart
                  data={visibleData}
                  direction="decreased"
                  colorMap={colorMap}
                />
              </Panel>
            </>
          ) : (
            <Panel
              variant="compact"
              title={chartLabels.activity}
              icon={SwapVertIcon}
              iconBackground="indigo"
            >
              <PriceActivityChart data={visibleData} colorMap={colorMap} />
            </Panel>
          )}
        </>
      )}
    </>
  );
}

export default function DetailContent<T>({
  storageKeyPrefix,
  entityType,
  useDetailData,
  useAvailableEntities,
  mapToDetail,
  chartLabels,
}: DetailContentProps<T>) {
  const { t } = useTranslation();
  const monthsKey = `${storageKeyPrefix}.months`;
  const modeKey = `${storageKeyPrefix}.dataSource`;
  const enabledKey = `${storageKeyPrefix}.enabled`;

  const { fuelType: selectedFuelType, setFuelType: setSelectedFuelType } =
    useFuelType();
  const [selectedMonths, setSelectedMonths] = useState<number>(3);
  const [dataSourceMode, setDataSourceMode] =
    useState<DetailDataSourceMode>("favourites");
  const [enabledEntities, setEnabledEntities] = useState<Set<string>>(
    new Set(),
  );

  // Restore persisted state on mount
  useEffect(() => {
    startTransition(() => {
      const storedMonths = localStorage.getItem(monthsKey);
      if (storedMonths === "3" || storedMonths === "12") {
        setSelectedMonths(parseInt(storedMonths, 10));
      }

      const storedMode = localStorage.getItem(modeKey);
      if (storedMode === "favourites" || storedMode === "all") {
        setDataSourceMode(storedMode);
      }

      const storedEnabled = localStorage.getItem(enabledKey);
      if (storedEnabled) {
        try {
          const parsed = JSON.parse(storedEnabled);
          if (Array.isArray(parsed)) {
            setEnabledEntities(new Set(parsed));
          }
        } catch {
          // Ignore malformed stored data
        }
      }
    });
  }, [monthsKey, modeKey, enabledKey]);

  const handleFuelTypeChange = (fuelType: FuelType) => {
    setSelectedFuelType(fuelType);
  };

  const handleMonthsChange = (months: number) => {
    setSelectedMonths(months);
    localStorage.setItem(monthsKey, String(months));
  };

  const handleModeChange = (mode: DetailDataSourceMode) => {
    // When switching modes, reset enabled entities so the chart component
    // can reinitialize them based on the new data set
    setEnabledEntities(new Set());
    setDataSourceMode(mode);
    localStorage.setItem(modeKey, mode);
    localStorage.removeItem(enabledKey);
  };

  const handleEntitiesChanged = useCallback(
    (entities: Set<string>, _allEntities: string[]) => {
      setEnabledEntities(entities);
      localStorage.setItem(enabledKey, JSON.stringify(Array.from(entities)));
    },
    [enabledKey],
  );

  const timeRangeLabels: Record<number, string> = {
    3: "3M",
    12: "12M",
  };

  const fuelTypeLabels: Record<FuelType, string> = {
    e5: t.fuelPrices.e5,
    e10: t.fuelPrices.e10,
    diesel: t.fuelPrices.diesel,
  };

  const summary = [
    dataSourceMode === "favourites"
      ? t.statistics.dataSource.favourites
      : t.statistics.dataSource.all,
    timeRangeLabels[selectedMonths] ?? `${selectedMonths}M`,
    fuelTypeLabels[selectedFuelType],
  ];

  return (
    <StackLayout>
      <FilterPanel
        title={t.statistics.filters}
        collapsedSummary={summary}
        storageKey={`${storageKeyPrefix}-filter`}
      >
        <FilterRow label={t.statistics.dataSource.label}>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleModeChange("favourites")}
              className={
                dataSourceMode === "favourites"
                  ? "btn-toggle-active"
                  : "btn-toggle-inactive"
              }
            >
              {t.statistics.dataSource.favourites}
            </button>
            <button
              onClick={() => handleModeChange("all")}
              className={
                dataSourceMode === "all"
                  ? "btn-toggle-active"
                  : "btn-toggle-inactive"
              }
            >
              {t.statistics.dataSource.all}
            </button>
          </div>
        </FilterRow>
        <FilterRow label={t.statistics.timeRange}>
          <TimeRangeSelector
            selectedMonths={selectedMonths}
            onMonthsChange={handleMonthsChange}
          />
        </FilterRow>
        <FilterRow label={t.statistics.selectFuelType}>
          <FuelTypeSelector
            selectedFuelType={selectedFuelType}
            onFuelTypeChange={handleFuelTypeChange}
          />
        </FilterRow>
      </FilterPanel>

      <Suspense fallback={<LoadingSpinner />}>
        <DetailCharts
          entityType={entityType}
          useDetailData={useDetailData}
          useAvailableEntities={useAvailableEntities}
          mapToDetail={mapToDetail}
          chartLabels={chartLabels}
          selectedFuelType={selectedFuelType}
          selectedMonths={selectedMonths}
          dataSourceMode={dataSourceMode}
          enabledEntities={enabledEntities}
          onEntitiesChanged={handleEntitiesChanged}
        />
      </Suspense>
    </StackLayout>
  );
}
