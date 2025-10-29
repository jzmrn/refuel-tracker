import { useState, useEffect } from "react";
import { format } from "date-fns";
import MetricDefinitionForm from "@/components/MetricDefinitionForm";
import MetricDefinitionList from "@/components/MetricDefinitionList";
import AddMetricValueForm from "@/components/AddMetricValueForm";
import apiService, {
  Metric,
  MetricSummary,
  MetricCreate,
  MetricDefinition,
  MetricDefinitionCreate,
} from "@/lib/api";

export default function Metrics() {
  const [activeTab, setActiveTab] = useState<"definitions" | "values">(
    "definitions"
  );
  const [isDefinitionFormOpen, setIsDefinitionFormOpen] = useState(false);
  const [isValueFormOpen, setIsValueFormOpen] = useState(false);
  const [selectedDefinition, setSelectedDefinition] =
    useState<MetricDefinition | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [summary, setSummary] = useState<MetricSummary | null>(null);
  const [recentMetrics, setRecentMetrics] = useState<Metric[]>([]);
  const [definitions, setDefinitions] = useState<MetricDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [summaryData, metricsData, definitionsData] = await Promise.all([
        apiService.getMetricsSummary(),
        apiService.getMetrics({ limit: 10 }),
        apiService.getMetricDefinitions(),
      ]);
      setSummary(summaryData);
      setRecentMetrics(metricsData);
      setDefinitions(definitionsData);
    } catch (error) {
      console.error("Error fetching metrics data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDefinition = async (
    definitionData: MetricDefinitionCreate
  ) => {
    try {
      await apiService.createMetricDefinition(definitionData);
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("Error creating metric definition:", error);
      alert("Failed to create metric definition. Please try again.");
    }
  };

  const handleAddMetricValue = async (metricData: MetricCreate) => {
    try {
      await apiService.addMetric(metricData);
      setRefreshTrigger((prev) => prev + 1);
      setSelectedDefinition(null);
    } catch (error) {
      console.error("Error adding metric value:", error);
      alert("Failed to add metric value. Please try again.");
    }
  };

  const handleSelectDefinition = (definition: MetricDefinition) => {
    setSelectedDefinition(definition);
    setIsValueFormOpen(true);
  };

  const getDefinitionById = (metricId: string) => {
    return definitions.find((d) => d.id === metricId);
  };

  const formatMetricData = (
    data: Record<string, string | number | boolean>
  ) => {
    return Object.entries(data).map(([key, value]) => (
      <span
        key={key}
        className="inline-block bg-gray-100 rounded px-2 py-1 text-xs mr-2 mb-1"
      >
        <span className="font-medium">{key}:</span> {String(value)}
      </span>
    ));
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Metrics Tracking</h1>
          <p className="text-gray-600 mt-2">
            Manage metric definitions and track values over time
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Values</p>
              <p className="text-2xl font-semibold text-gray-900">
                {loading ? "..." : summary?.total_metrics || 0}
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
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Definitions</p>
              <p className="text-2xl font-semibold text-gray-900">
                {loading ? "..." : definitions.length || 0}
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
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Recent (30d)</p>
              <p className="text-2xl font-semibold text-gray-900">
                {loading ? "..." : summary?.recent_count || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("definitions")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "definitions"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Metric Definitions
            </button>
            <button
              onClick={() => setActiveTab("values")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "values"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Recent Values
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "definitions" && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Metric Definitions
            </h2>
            <button
              onClick={() => setIsDefinitionFormOpen(true)}
              className="btn btn-primary"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Create Definition
            </button>
          </div>

          <MetricDefinitionList
            onSelectDefinition={handleSelectDefinition}
            refreshKey={refreshTrigger}
          />
        </div>
      )}

      {activeTab === "values" && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Recent Values
            </h2>
            <span className="text-sm text-gray-500">Last 10 entries</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">Loading metrics...</div>
            </div>
          ) : recentMetrics.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg
                className="w-12 h-12 mx-auto mb-4 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-lg font-medium mb-2">No metric values yet</p>
              <p>Create a metric definition first, then add values</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentMetrics.map((metric, index) => {
                const definition = getDefinitionById(metric.metric_id);
                return (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium text-gray-900">
                            {definition?.title || "Unknown Metric"}
                          </h3>
                          {definition && (
                            <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                              {definition.category}
                            </span>
                          )}
                          {definition?.unit && (
                            <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                              {definition.unit}
                            </span>
                          )}
                        </div>

                        <div className="mb-2">
                          {formatMetricData(metric.data)}
                        </div>

                        {metric.notes && (
                          <p className="text-sm text-gray-600 mb-2">
                            {metric.notes}
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        <p className="text-sm text-gray-500">
                          {format(new Date(metric.timestamp), "MMM d, yyyy")}
                        </p>
                        <p className="text-xs text-gray-400">
                          {format(new Date(metric.timestamp), "h:mm a")}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Forms */}
      <MetricDefinitionForm
        isOpen={isDefinitionFormOpen}
        onClose={() => setIsDefinitionFormOpen(false)}
        onSubmit={handleCreateDefinition}
      />

      <AddMetricValueForm
        isOpen={isValueFormOpen}
        onClose={() => {
          setIsValueFormOpen(false);
          setSelectedDefinition(null);
        }}
        onSubmit={handleAddMetricValue}
        definition={selectedDefinition}
      />
    </div>
  );
}
