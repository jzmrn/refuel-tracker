import { useState, useEffect } from "react";
import { format } from "date-fns";
import AddDataPointForm from "@/components/data-tracking/AddDataPointForm";
import DataPointList from "@/components/data-tracking/DataPointList";
import DataPointStatistics from "@/components/data-tracking/DataPointStatistics";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import Snackbar from "@/components/common/Snackbar";
import FloatingActionButton from "@/components/common/FloatingActionButton";
import SummaryCard from "@/components/common/SummaryCard";
import { useSnackbar } from "@/lib/useSnackbar";
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
      showError("Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddDataPoint = async (pointData: DataPointCreate) => {
    try {
      await apiService.createDataPoint(pointData);
      setRefreshTrigger((prev) => prev + 1);

      showSuccess("Data point added successfully!");

      // Close mobile form and switch to values tab to show the newly added entry
      setIsMobileFormOpen(false);
      setActiveTab("values");
      // Set the selected label to the newly added point's label
      setValuesSelectedLabel(pointData.label);
    } catch (error) {
      console.error("Error adding data point:", error);
      showError("Failed to add data point.");
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
      showSuccess("Data point deleted successfully!");
    } catch (error) {
      console.error("Error deleting data point:", error);
      showError("Failed to delete data point.");
      setDeletingPoint(null);
    }
  };

  const tabs = [
    { id: "add" as TabType, label: "Add Data", icon: "+" },
    { id: "statistics" as TabType, label: "Statistics", icon: "📊" },
    { id: "values" as TabType, label: "All Values", icon: "📋" },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "add":
        return (
          <div className="card">
            <h2 className="heading-2 mb-6">Add Data Point</h2>
            <AddDataPointForm
              onSubmit={handleAddDataPoint}
              existingLabels={existingLabels}
            />
          </div>
        );
      case "statistics":
        return (
          <div>
            {existingLabels.length > 0 && (
              <div className="panel mb-6">
                <label htmlFor="stats-label-select" className="label">
                  Select Metric to View Statistics
                </label>
                <select
                  id="stats-label-select"
                  value={statisticsSelectedLabel}
                  onChange={(e) => setStatisticsSelectedLabel(e.target.value)}
                  className="input"
                >
                  {existingLabels.map((label) => (
                    <option key={label} value={label}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {statisticsSelectedLabel ? (
              <DataPointStatistics
                dataPoints={statisticsFilteredDataPoints}
                label={statisticsSelectedLabel}
                loading={loading}
              />
            ) : (
              <div className="panel">
                <div className="empty-state">
                  <p>No metrics available.</p>
                  <p className="text-sm mt-1">
                    Add some data points first to see statistics.
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      case "values":
        return (
          <div>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <SummaryCard
                title="Unique Labels"
                value={summary?.unique_labels || 0}
                loading={loading}
                iconBgColor="purple"
                icon={
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                    />
                  </svg>
                }
              />

              <SummaryCard
                title="Total Entries"
                value={summary?.total_entries || 0}
                loading={loading}
                iconBgColor="blue"
                icon={
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                }
              />
            </div>

            {existingLabels.length > 0 && (
              <div className="panel mb-6">
                <label htmlFor="values-label-select" className="label">
                  Filter by Metric
                </label>
                <select
                  id="values-label-select"
                  value={valuesSelectedLabel}
                  onChange={(e) => setValuesSelectedLabel(e.target.value)}
                  className="input"
                >
                  <option value="">All Metrics</option>
                  {existingLabels.map((label) => (
                    <option key={label} value={label}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <DataPointList
              dataPoints={filteredDataPoints}
              onDelete={handleDeleteDataPoint}
              loading={loading}
            />
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
          <h1 className="heading-1">Data Tracking</h1>
          <p className="text-secondary mt-2 text-sm md:text-base">
            Track numerical data over time with custom labels
          </p>
        </div>
      </div>

      {/* Desktop Tab Navigation - Hidden on mobile */}
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

      {/* Desktop Tab Content */}
      <div className="min-h-[400px] hidden md:block">{renderTabContent()}</div>

      {/* Mobile Unified View - Visible only on mobile */}
      <div className="md:hidden space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          <SummaryCard
            title="Labels"
            value={loading ? "..." : summary?.unique_labels?.toString() || "0"}
            icon={
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
            }
            iconBgColor="purple"
            loading={loading}
          />

          <SummaryCard
            title="Entries"
            value={loading ? "..." : summary?.total_entries?.toString() || "0"}
            icon={
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            }
            iconBgColor="blue"
            loading={loading}
          />
        </div>

        {/* Statistics Section */}
        {existingLabels.length > 0 && (
          <div>
            <div className="panel mb-4">
              <label htmlFor="mobile-stats-label-select" className="label">
                Select Metric to View Statistics
              </label>
              <select
                id="mobile-stats-label-select"
                value={statisticsSelectedLabel}
                onChange={(e) => setStatisticsSelectedLabel(e.target.value)}
                className="input"
              >
                {existingLabels.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            {statisticsSelectedLabel && (
              <DataPointStatistics
                dataPoints={statisticsFilteredDataPoints}
                label={statisticsSelectedLabel}
                loading={loading}
              />
            )}
          </div>
        )}

        {/* Data Points List */}
        {existingLabels.length > 0 && (
          <div>
            <div className="panel mb-4">
              <label htmlFor="mobile-values-label-select" className="label">
                Filter by Metric
              </label>
              <select
                id="mobile-values-label-select"
                value={valuesSelectedLabel}
                onChange={(e) => setValuesSelectedLabel(e.target.value)}
                className="input"
              >
                <option value="">All Metrics</option>
                {existingLabels.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <DataPointList
              dataPoints={filteredDataPoints}
              onDelete={handleDeleteDataPoint}
              loading={loading}
            />
          </div>
        )}

        {existingLabels.length === 0 && !loading && (
          <div className="panel">
            <div className="empty-state">
              <p>No data points yet.</p>
              <p className="text-sm mt-1">
                Add your first data point using the + button below.
              </p>
            </div>
          </div>
        )}
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
        title="Delete Data Point"
        message={`Are you sure you want to delete this data point (${deletingPoint?.label}: ${deletingPoint?.value})? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDeleteDataPoint}
        onCancel={() => setDeletingPoint(null)}
      />

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
