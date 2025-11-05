import React, { useState, useEffect } from "react";
import { NextPage } from "next";
import AddRefuelForm from "../components/AddRefuelForm";
import RefuelList from "../components/RefuelList";
import RefuelStats from "../components/RefuelStats";
import {
  apiService,
  RefuelMetric,
  RefuelStatistics,
  RefuelMetricCreate,
} from "../lib/api";

type TabType = "add" | "statistics" | "entries";

const RefuelPage: NextPage = () => {
  const [activeTab, setActiveTab] = useState<TabType>("add");
  const [refuels, setRefuels] = useState<RefuelMetric[]>([]);
  const [statistics, setStatistics] = useState<RefuelStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch refuel data
  const fetchRefuels = async () => {
    try {
      setLoading(true);
      setError(null); // Clear previous errors
      console.log("Fetching refuel data...");

      const data = await apiService.getRefuelMetrics({ limit: 50 });
      console.log("Refuel data received:", data);

      setRefuels(data);
    } catch (err: any) {
      console.error("Error fetching refuel data:", err);

      // More specific error messages
      if (err.response?.status === 404) {
        setError("Refuel API not available");
      } else if (err.response?.status === 503) {
        setError("Metric Registry not available - Server restart required");
      } else if (err.response?.data?.detail) {
        setError(`API Error: ${err.response.data.detail}`);
      } else {
        setError(
          `Error loading refuel data: ${err.message || "Unknown error"}`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics
  const fetchStatistics = async () => {
    try {
      setStatsLoading(true);
      // Get statistics for the last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const data = await apiService.getRefuelStatistics({
        start_date: sixMonthsAgo.toISOString().split("T")[0],
      });
      setStatistics(data);
    } catch (err) {
      console.error("Error fetching refuel statistics:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchRefuels();
    fetchStatistics();
  }, []);

  // Handle form submission
  const handleAddRefuel = async (refuelData: RefuelMetricCreate) => {
    try {
      setError(null);
      await apiService.createRefuelMetric(refuelData);

      setSuccessMessage("Refuel entry added successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);

      // Refresh data
      await fetchRefuels();
      await fetchStatistics();

      // Switch to entries tab to show the newly added entry
      setActiveTab("entries");
    } catch (err) {
      console.error("Error adding refuel entry:", err);
      setError("Error adding refuel entry");
    }
  };

  // Filter functions for quick access
  const filterThisMonth = async () => {
    try {
      setLoading(true);
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const data = await apiService.getRefuelMetrics({
        start_date: startOfMonth.toISOString().split("T")[0],
        limit: 100,
      });
      setRefuels(data);
    } catch (err) {
      console.error("Error filtering by month:", err);
      setError("Error filtering data");
    } finally {
      setLoading(false);
    }
  };

  const filterThisYear = async () => {
    try {
      setLoading(true);
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const data = await apiService.getRefuelMetrics({
        start_date: startOfYear.toISOString().split("T")[0],
        limit: 365,
      });
      setRefuels(data);
    } catch (err) {
      console.error("Error filtering by year:", err);
      setError("Error filtering data");
    } finally {
      setLoading(false);
    }
  };

  const showAll = () => {
    fetchRefuels();
  };

  const tabs = [
    { id: "add" as TabType, label: "Add Entry", icon: "+" },
    { id: "statistics" as TabType, label: "Statistics", icon: "📊" },
    { id: "entries" as TabType, label: "All Entries", icon: "📋" },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "add":
        return <AddRefuelForm onSubmit={handleAddRefuel} />;
      case "statistics":
        return (
          <RefuelStats
            statistics={statistics}
            refuelData={refuels}
            loading={statsLoading}
          />
        );
      case "entries":
        return (
          <div>
            {/* Filter Options */}
            <div className="mb-6 bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-3">Filter</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={showAll}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Show All
                </button>
                <button
                  onClick={filterThisMonth}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  This Month
                </button>
                <button
                  onClick={filterThisYear}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                >
                  This Year
                </button>
              </div>
            </div>
            <RefuelList refuels={refuels} loading={loading} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Refuel Tracking</h1>
        <p className="mt-2 text-gray-600">
          Manage your fuel data and track fuel costs
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

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
                {tab.id === "entries" && refuels.length > 0 && (
                  <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2 rounded-full text-xs font-medium">
                    {refuels.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">{renderTabContent()}</div>
    </div>
  );
};

export default RefuelPage;
