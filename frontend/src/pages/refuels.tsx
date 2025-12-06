import React, { useState, useEffect } from "react";
import { NextPage } from "next";
import AddRefuelForm from "../components/refuels/AddRefuelForm";
import RefuelList from "../components/refuels/RefuelList";
import RefuelStats from "../components/refuels/RefuelStats";
import Snackbar from "../components/common/Snackbar";
import FloatingActionButton from "../components/common/FloatingActionButton";
import { useSnackbar } from "../lib/useSnackbar";
import { useTranslation } from "../lib/i18n/LanguageContext";
import {
  apiService,
  RefuelMetric,
  RefuelStatistics,
  RefuelMetricCreate,
  Car,
} from "../lib/api";

type TabType = "add" | "statistics" | "entries";
type FilterType = "all" | "month" | "year";

const RefuelPage: NextPage = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>("add");
  const [refuels, setRefuels] = useState<RefuelMetric[]>([]);
  const [statistics, setStatistics] = useState<RefuelStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [isMobileFormOpen, setIsMobileFormOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [selectedCar, setSelectedCar] = useState<string>("");
  const [cars, setCars] = useState<Car[]>([]);
  const { snackbar, showSuccess, showError, hideSnackbar } = useSnackbar();

  // Fetch cars on mount
  useEffect(() => {
    const fetchCars = async () => {
      try {
        const data = await apiService.getCars();
        setCars(data);
        // Auto-select first car if available
        if (data.length > 0 && !selectedCar) {
          setSelectedCar(data[0].id);
        }
      } catch (error) {
        console.error("Error fetching cars:", error);
      }
    };
    fetchCars();
  }, []);

  // Refetch data when selected car changes
  useEffect(() => {
    if (selectedCar) {
      fetchRefuels();
      fetchStatistics();
    }
  }, [selectedCar]);

  // Fetch refuel data
  const fetchRefuels = async () => {
    if (!selectedCar) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log("Fetching refuel data...");

      const data = await apiService.getRefuelMetrics({
        car_id: selectedCar,
        limit: 50,
      });
      console.log("Refuel data received:", data);

      setRefuels(data);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      showError(t.refuels.errorLoadingData);
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics
  const fetchStatistics = async () => {
    if (!selectedCar) {
      setStatsLoading(false);
      return;
    }

    try {
      setStatsLoading(true);
      // Get statistics for the last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const data = await apiService.getRefuelStatistics({
        car_id: selectedCar,
        start_date: sixMonthsAgo.toISOString().split("T")[0],
      });
      setStatistics(data);
    } catch (err) {
      console.error("Error fetching refuel statistics:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Handle form submission
  const handleAddRefuel = async (refuelData: RefuelMetricCreate) => {
    try {
      await apiService.createRefuelMetric(refuelData);

      showSuccess(t.refuels.refuelAddedSuccess);
      setIsMobileFormOpen(false);

      // Refresh data
      await fetchRefuels();
      await fetchStatistics();
    } catch (err) {
      console.error("Error adding refuel entry:", err);
      showError(t.refuels.errorAddingRefuel);
    }
  };

  // Filter functions for quick access
  const filterThisMonth = async () => {
    try {
      setLoading(true);
      setActiveFilter("month");
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const data = await apiService.getRefuelMetrics({
        car_id: selectedCar || undefined,
        start_date: startOfMonth.toISOString().split("T")[0],
        limit: 100,
      });
      setRefuels(data);
    } catch (err) {
      console.error("Error filtering by month:", err);
      showError(t.refuels.errorFiltering);
    } finally {
      setLoading(false);
    }
  };

  const filterThisYear = async () => {
    try {
      setLoading(true);
      setActiveFilter("year");
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const data = await apiService.getRefuelMetrics({
        car_id: selectedCar || undefined,
        start_date: startOfYear.toISOString().split("T")[0],
        limit: 365,
      });
      setRefuels(data);
    } catch (err) {
      console.error("Error filtering by year:", err);
      showError(t.refuels.errorFiltering);
    } finally {
      setLoading(false);
    }
  };

  const showAll = () => {
    setActiveFilter("all");
    fetchRefuels();
  };

  // Reusable component functions
  const renderStatistics = () => (
    <RefuelStats
      statistics={statistics}
      refuelData={refuels}
      loading={statsLoading}
    />
  );

  const renderFilterOptions = () => (
    <div className="space-y-4 mb-6">
      {/* Car Selector */}
      {cars.length > 0 && (
        <div className="panel p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Car:
            </label>
            <select
              value={selectedCar}
              onChange={(e) => setSelectedCar(e.target.value)}
              className="flex-1 max-w-md px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {cars.map((car) => (
                <option key={car.id} value={car.id}>
                  {car.name} ({car.year})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Time Window Filter */}
      <div className="panel p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t.refuels.filter}:
          </label>
          <div className="flex gap-2">
            <button
              onClick={showAll}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeFilter === "all"
                  ? "bg-primary-50 text-primary-700 dark:bg-blue-900/20 dark:text-blue-300"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {t.refuels.showAll}
            </button>
            <button
              onClick={filterThisMonth}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeFilter === "month"
                  ? "bg-primary-50 text-primary-700 dark:bg-blue-900/20 dark:text-blue-300"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {t.refuels.thisMonth}
            </button>
            <button
              onClick={filterThisYear}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeFilter === "year"
                  ? "bg-primary-50 text-primary-700 dark:bg-blue-900/20 dark:text-blue-300"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {t.refuels.thisYear}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRefuelList = () => (
    <RefuelList refuels={refuels} loading={loading} />
  );

  const tabs = [
    { id: "add" as TabType, label: t.refuels.addEntry, icon: "+" },
    { id: "statistics" as TabType, label: t.refuels.statistics, icon: "📊" },
    { id: "entries" as TabType, label: t.refuels.allEntries, icon: "📋" },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "add":
        return (
          <AddRefuelForm
            onSubmit={handleAddRefuel}
            preselectedCar={selectedCar}
          />
        );
      case "statistics":
        return renderStatistics();
      case "entries":
        return (
          <div>
            {/* Filter Options */}
            {renderFilterOptions()}
            {renderRefuelList()}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 md:py-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
          {t.refuels.refuelTracking}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300 text-sm md:text-base">
          {t.refuels.manageFuelData}
        </p>
      </div>

      {/* Snackbar */}
      <Snackbar
        message={snackbar.message}
        type={snackbar.type}
        isVisible={snackbar.isVisible}
        onClose={hideSnackbar}
      />

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
        {/* Filter Options */}
        {renderFilterOptions()}

        {/* Refuel Entries */}
        {renderRefuelList()}

        {/* Statistics Section */}
        {renderStatistics()}
      </div>

      {/* Floating Action Button for Mobile */}
      <FloatingActionButton
        onAddClick={() => setIsMobileFormOpen(true)}
        isOpen={isMobileFormOpen}
        onClose={() => setIsMobileFormOpen(false)}
      >
        <AddRefuelForm onSubmit={handleAddRefuel} />
      </FloatingActionButton>
    </div>
  );
};

export default RefuelPage;
