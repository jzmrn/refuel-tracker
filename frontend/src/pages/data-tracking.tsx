import { useState, useEffect } from "react";
import { format } from "date-fns";
import AddDataPointForm from "@/components/AddDataPointForm";
import DataPointList from "@/components/DataPointList";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import ErrorDialog from "@/components/ErrorDialog";
import apiService, {
  DataPointResponse,
  DataPointCreate,
  DataSummaryResponse,
} from "@/lib/api";

// Type aliases for easier usage
export type DataPoint = DataPointResponse;
export type DataSummary = DataSummaryResponse;

export default function DataTracking() {
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
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

      {/* Add Data Point Form */}
      <div className="card mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          Add Data Point
        </h2>
        <AddDataPointForm
          onSubmit={handleAddDataPoint}
          existingLabels={existingLabels}
        />
      </div>

      {/* Data Points List */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Recent Data Points
          </h2>
          <span className="text-sm text-gray-500">
            {dataPoints.length} {dataPoints.length === 1 ? "entry" : "entries"}
          </span>
        </div>

        <DataPointList
          dataPoints={dataPoints}
          onDelete={handleDeleteDataPoint}
          loading={loading}
        />
      </div>

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
