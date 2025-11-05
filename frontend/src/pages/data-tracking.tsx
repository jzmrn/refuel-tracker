import { useState, useEffect } from "react";
import { format } from "date-fns";
import AddDataPointForm from "@/components/data-tracking/AddDataPointForm";
import DataPointList from "@/components/data-tracking/DataPointList";
import DataPointStatistics from "@/components/data-tracking/DataPointStatistics";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import ErrorDialog from "@/components/common/ErrorDialog";
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
  const [selectedLabel, setSelectedLabel] = useState<string>("");
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [filteredDataPoints, setFilteredDataPoints] = useState<DataPoint[]>([]);
  const [existingLabels, setExistingLabels] = useState<string[]>([]);
  const [summary, setSummary] = useState<DataSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingPoint, setDeletingPoint] = useState<DataPoint | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  useEffect(() => {
    // Filter data points when selected label changes
    if (selectedLabel && selectedLabel !== "") {
      setFilteredDataPoints(
        dataPoints.filter((point) => point.label === selectedLabel)
      );
    } else {
      setFilteredDataPoints(dataPoints);
    }
  }, [selectedLabel, dataPoints]);

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

      // Set default selected label to first available label if none selected
      if (!selectedLabel && labelsData.length > 0) {
        setSelectedLabel(labelsData[0]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDataPoint = async (pointData: DataPointCreate) => {
    try {
      await apiService.createDataPoint(pointData);
      setRefreshTrigger((prev) => prev + 1);

      // Switch to values tab to show the newly added entry
      setActiveTab("values");
      // Set the selected label to the newly added point's label
      setSelectedLabel(pointData.label);
    } catch (error) {
      console.error("Error adding data point:", error);
      setErrorMessage("Failed to add data point. Please try again.");
      setShowError(true);
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
    } catch (error) {
      console.error("Error deleting data point:", error);
      setErrorMessage("Failed to delete data point. Please try again.");
      setShowError(true);
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
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Add Data Point
            </h2>
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
              <div className="mb-6 bg-white p-4 rounded-lg shadow">
                <label
                  htmlFor="stats-label-select"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Select Metric to View Statistics
                </label>
                <select
                  id="stats-label-select"
                  value={selectedLabel}
                  onChange={(e) => setSelectedLabel(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  {existingLabels.map((label) => (
                    <option key={label} value={label}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {selectedLabel ? (
              <DataPointStatistics
                dataPoints={filteredDataPoints}
                label={selectedLabel}
                loading={loading}
              />
            ) : (
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-center py-8 text-gray-500">
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
            {existingLabels.length > 0 && (
              <div className="mb-6 bg-white p-4 rounded-lg shadow">
                <label
                  htmlFor="values-label-select"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Filter by Metric
                </label>
                <select
                  id="values-label-select"
                  value={selectedLabel}
                  onChange={(e) => setSelectedLabel(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedLabel
                    ? `${selectedLabel} Values`
                    : "All Data Points"}
                </h2>
                <span className="text-sm text-gray-500">
                  {filteredDataPoints.length}{" "}
                  {filteredDataPoints.length === 1 ? "entry" : "entries"}
                </span>
              </div>

              <DataPointList
                dataPoints={filteredDataPoints}
                onDelete={handleDeleteDataPoint}
                loading={loading}
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Data Tracking</h1>
          <p className="text-gray-600 mt-2">
            Track numerical data over time with custom labels
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-blue-600"
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
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Entries</p>
              <p className="text-2xl font-semibold text-gray-900">
                {loading ? "..." : summary?.total_entries || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-purple-600"
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
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Unique Labels</p>
              <p className="text-2xl font-semibold text-gray-900">
                {loading ? "..." : summary?.unique_labels || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                  />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Average Value</p>
              <p className="text-2xl font-semibold text-gray-900">
                {loading
                  ? "..."
                  : summary?.value_stats?.average
                  ? summary.value_stats.average.toFixed(2)
                  : "N/A"}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                  />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Value Range</p>
              <p className="text-lg font-semibold text-gray-900">
                {loading
                  ? "..."
                  : summary?.value_stats?.min !== null &&
                    summary?.value_stats?.max !== null &&
                    summary?.value_stats?.min !== undefined &&
                    summary?.value_stats?.max !== undefined
                  ? `${summary.value_stats.min} - ${summary.value_stats.max}`
                  : "N/A"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600 bg-blue-50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-2 px-4 border-b-2 font-medium text-sm transition-all duration-200 rounded-t-lg flex items-center gap-2`}
              >
                <span className="text-lg">{tab.icon}</span>
                {tab.label}
                {tab.id === "values" && filteredDataPoints.length > 0 && (
                  <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2 rounded-full text-xs font-medium">
                    {filteredDataPoints.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">{renderTabContent()}</div>

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

      {/* Error Dialog */}
      <ErrorDialog
        isOpen={showError}
        title="Error"
        message={errorMessage}
        onClose={() => setShowError(false)}
        variant="error"
      />
    </div>
  );
}
