import { useState, useEffect } from "react";
import { format } from "date-fns";
import AddDataPointForm from "@/components/data-tracking/AddDataPointForm";
import DataPointList from "@/components/data-tracking/DataPointList";
import DataPointStatistics from "@/components/data-tracking/DataPointStatistics";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import Snackbar from "@/components/common/Snackbar";
import FloatingActionButton from "@/components/common/FloatingActionButton";
import SummaryCard from "@/components/common/SummaryCard";
import { TagIcon, ChartIcon } from "@/components/common/Icons";
import { useSnackbar } from "@/lib/useSnackbar";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import apiService, {
  DataPointResponse,
  DataPointCreate,
  DataSummaryResponse,
} from "@/lib/api";

// Type aliases for easier usage
export type DataPoint = DataPointResponse;
export type DataSummary = DataSummaryResponse;
type TabType = "add" | "statistics" | "values";

export default function DataTracking() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>("add");
  const [statisticsSelectedLabel, setStatisticsSelectedLabel] =
    useState<string>("");
  const [valuesSelectedLabel, setValuesSelectedLabel] = useState<string>("");
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [filteredDataPoints, setFilteredDataPoints] = useState<DataPoint[]>([]);
  const [statisticsFilteredDataPoints, setStatisticsFilteredDataPoints] =
    useState<DataPoint[]>([]);
  const [existingLabels, setExistingLabels] = useState<string[]>([]);
  const [summary, setSummary] = useState<DataSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingPoint, setDeletingPoint] = useState<DataPoint | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isMobileFormOpen, setIsMobileFormOpen] = useState(false);
  const { snackbar, showSuccess, showError, hideSnackbar } = useSnackbar();

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  useEffect(() => {
    // Filter data points for values tab
    if (valuesSelectedLabel && valuesSelectedLabel !== "") {
      setFilteredDataPoints(
        dataPoints.filter((point) => point.label === valuesSelectedLabel),
      );
    } else {
      setFilteredDataPoints(dataPoints);
    }
  }, [valuesSelectedLabel, dataPoints]);

  useEffect(() => {
    // Filter data points for statistics tab
    if (statisticsSelectedLabel && statisticsSelectedLabel !== "") {
      setStatisticsFilteredDataPoints(
        dataPoints.filter((point) => point.label === statisticsSelectedLabel),
      );
    } else {
      setStatisticsFilteredDataPoints(dataPoints);
    }
  }, [statisticsSelectedLabel, dataPoints]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pointsData, labelsData, summaryData] = await Promise.all([
        apiService.getDataPoints({ limit: 100 }), // Get recent 100 entries
        apiService.getExistingLabels(),
        apiService.getDataSummary(),
      ]);
      setDataPoints(pointsData);
      setExistingLabels(labelsData);
      setSummary(summaryData);

      // Set default selected labels to first available label if none selected
      if (!statisticsSelectedLabel && labelsData.length > 0) {
        setStatisticsSelectedLabel(labelsData[0]);
      }
      if (!valuesSelectedLabel && labelsData.length > 0) {
        // Values tab starts with "All Metrics" selected (empty string)
        setValuesSelectedLabel("");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      showError(t.dataTracking.failedToLoadData);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDataPoint = async (pointData: DataPointCreate) => {
    try {
      await apiService.createDataPoint(pointData);
      setRefreshTrigger((prev) => prev + 1);

      showSuccess(`${t.common.success}: ${t.dataTracking.dataPointAdded}`);
      setIsMobileFormOpen(false);
    } catch (error) {
      console.error("Error adding data point:", error);
      showError(`${t.common.error}: ${t.dataTracking.failedToAddDataPoint}`);
    }
  };

  const handleDeleteDataPoint = (point: DataPoint) => {
    setDeletingPoint(point);
  };

  const confirmDeleteDataPoint = async () => {
    if (!deletingPoint) return;

    try {
      await apiService.deleteDataPoint(deletingPoint.id);
      setRefreshTrigger((prev) => prev + 1);
      setDeletingPoint(null);
      showSuccess(`${t.common.success}: ${t.dataTracking.dataPointDeleted}`);
    } catch (error) {
      console.error("Error deleting data point:", error);
      showError(`${t.common.error}: ${t.dataTracking.failedToDeleteDataPoint}`);
      setDeletingPoint(null);
    }
  };

  // Reusable component functions
  const renderSummaryCards = (
    gridCols: string = "grid-cols-1 lg:grid-cols-2",
  ) => (
    <div className={`grid ${gridCols} gap-6 mb-8`}>
      <SummaryCard
        title={t.dataTracking.uniqueLabels}
        value={{
          value: summary?.unique_labels || 0,
        }}
        loading={loading}
        iconBgColor="purple"
        icon={<TagIcon size="lg" color="purple" />}
      />

      <SummaryCard
        title={t.dataTracking.totalEntries}
        value={{
          value: summary?.total_entries || 0,
        }}
        loading={loading}
        iconBgColor="blue"
        icon={<ChartIcon size="lg" color="blue" />}
      />
    </div>
  );

  const renderStatisticsFilter = (
    id: string,
    labelKey: string,
    isMobile: boolean = false,
  ) =>
    existingLabels.length > 0 && (
      <div
        className={`panel ${
          isMobile ? "mb-4" : "mb-6"
        } flex justify-between items-center`}
      >
        <label htmlFor={id} className="label">
          {labelKey}
        </label>
        <select
          id={id}
          value={statisticsSelectedLabel}
          onChange={(e) => setStatisticsSelectedLabel(e.target.value)}
          className="input w-1/4"
        >
          {existingLabels.map((label) => (
            <option key={label} value={label}>
              {label}
            </option>
          ))}
        </select>
      </div>
    );

  const renderStatistics = () => (
    <DataPointStatistics
      dataPoints={statisticsFilteredDataPoints}
      label={statisticsSelectedLabel}
      loading={loading}
    />
  );

  const renderValuesFilter = (
    id: string,
    labelKey: string,
    isMobile: boolean = false,
  ) =>
    existingLabels.length > 0 && (
      <div
        className={`panel ${
          isMobile ? "mb-4" : "mb-6"
        } flex justify-between items-center`}
      >
        <label htmlFor={id} className="label">
          {labelKey}
        </label>
        <select
          id={id}
          value={valuesSelectedLabel}
          onChange={(e) => setValuesSelectedLabel(e.target.value)}
          className="input w-1/4"
        >
          <option value="">{t.dataTracking.allMetrics}</option>
          {existingLabels.map((label) => (
            <option key={label} value={label}>
              {label}
            </option>
          ))}
        </select>
      </div>
    );

  const renderDataPointList = () => (
    <DataPointList
      dataPoints={filteredDataPoints}
      onDelete={handleDeleteDataPoint}
      loading={loading}
    />
  );

  const tabs = [
    { id: "add" as TabType, label: t.dataTracking.addDataPoint, icon: "+" },
    {
      id: "statistics" as TabType,
      label: t.dataTracking.statistics,
      icon: "📊",
    },
    { id: "values" as TabType, label: t.timeSpans.allValues, icon: "📋" },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "add":
        return (
          <AddDataPointForm
            onSubmit={handleAddDataPoint}
            existingLabels={existingLabels}
          />
        );
      case "statistics":
        return (
          <div>
            {renderStatisticsFilter(
              "stats-label-select",
              `${t.dataTracking.selectMetricToView} ${t.dataTracking.statistics}`,
            )}
            {renderStatistics()}
          </div>
        );
      case "values":
        return (
          <div>
            {/* Summary Cards */}
            {renderSummaryCards()}

            {renderValuesFilter(
              "values-label-select",
              t.dataTracking.filterByMetric,
            )}

            {renderDataPointList()}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 md:py-8">
      {/* Header */}
      <div className="mb-6 md:mb-8 flex justify-between items-start">
        <div>
          <h1 className="heading-1">{t.dataTracking.title}</h1>
          <p className="text-secondary mt-2 text-sm md:text-base">
            {t.dataTracking.trackNumericalData}
          </p>
        </div>
      </div>
      {/* Desktop Tab Navigation - Hidden on mobile and md, shown from lg onwards */}
      <div className="tab-container">
        <div className="tab-border">
          <nav className="tab-nav" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tab-button ${
                  activeTab === tab.id
                    ? "tab-button-active"
                    : "tab-button-inactive"
                }`}
              >
                <span className="tab-icon">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>
      {/* Desktop Tab Content - Only shown from lg onwards */}
      <div className="min-h-[400px] hidden lg:block">{renderTabContent()}</div>
      {/* Mobile/Tablet Unified View - Visible on mobile and md, hidden from lg onwards */}
      <div className="lg:hidden space-y-6">
        {/* Summary Cards */}
        {renderSummaryCards("grid-cols-1")}

        {/* Statistics Section */}
        {existingLabels.length > 0 && (
          <div>
            {renderStatisticsFilter(
              "mobile-stats-label-select",
              t.dataTracking.selectMetricToViewStats,
              true,
            )}
            {statisticsSelectedLabel && renderStatistics()}
          </div>
        )}

        {/* Data Points List */}
        <div>
          {renderValuesFilter(
            "mobile-values-label-select",
            t.dataTracking.filterByMetric,
            true,
          )}

          {renderDataPointList()}
        </div>
      </div>
      {/* Floating Action Button for Mobile */}
      <FloatingActionButton
        onAddClick={() => setIsMobileFormOpen(true)}
        isOpen={isMobileFormOpen}
        onClose={() => setIsMobileFormOpen(false)}
      >
        <AddDataPointForm
          onSubmit={handleAddDataPoint}
          existingLabels={existingLabels}
        />
      </FloatingActionButton>
      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!deletingPoint}
        title={`${t.common.delete} Data Point`}
        message={`${t.dataTracking.dataPointDeleteConfirm} (${deletingPoint?.label}: ${deletingPoint?.value})? ${t.dataTracking.actionCannotBeUndone}`}
        confirmText={t.common.delete}
        cancelText={t.common.cancel}
        variant="danger"
        onConfirm={confirmDeleteDataPoint}
        onCancel={() => setDeletingPoint(null)}
      />{" "}
      {/* Snackbar */}
      <Snackbar
        message={snackbar.message}
        type={snackbar.type}
        isVisible={snackbar.isVisible}
        onClose={hideSnackbar}
      />
    </div>
  );
}
