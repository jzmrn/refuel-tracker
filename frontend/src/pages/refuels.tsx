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
} from "../lib/api";

type TabType = "add" | "statistics" | "entries";

const RefuelPage: NextPage = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>("add");
  const [refuels, setRefuels] = useState<RefuelMetric[]>([]);
  const [statistics, setStatistics] = useState<RefuelStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [isMobileFormOpen, setIsMobileFormOpen] = useState(false);
  const { snackbar, showSuccess, showError, hideSnackbar } = useSnackbar();

  // Fetch refuel data
  const fetchRefuels = async () => {
    try {
      setLoading(true);
      console.log("Fetching refuel data...");

      const data = await apiService.getRefuelMetrics({ limit: 50 });
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
      await apiService.createRefuelMetric(refuelData);

      showSuccess(t.refuels.refuelAddedSuccess);

      // Refresh data
      await fetchRefuels();
      await fetchStatistics();

      // Close mobile form and switch to entries tab to show the newly added entry
      setIsMobileFormOpen(false);
      setActiveTab("entries");
    } catch (err) {
      console.error("Error adding refuel entry:", err);
      showError(t.refuels.errorAddingRefuel);
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
      showError(t.refuels.errorFiltering);
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
      showError(t.refuels.errorFiltering);
    } finally {
      setLoading(false);
    }
  };

  const showAll = () => {
    fetchRefuels();
  };

  const tabs = [
    { id: "add" as TabType, label: t.refuels.addEntry, icon: "+" },
    { id: "statistics" as TabType, label: t.refuels.statistics, icon: "📊" },
    { id: "entries" as TabType, label: t.refuels.allEntries, icon: "📋" },
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
            <div className="filter-container flex justify-between items-center">
              <h3 className="filter-title">{t.refuels.filter}</h3>
              <div className="filter-buttons">
                <button
                  onClick={showAll}
                  className="filter-button filter-button-primary"
                >
                  {t.refuels.showAll}
                </button>
                <button
                  onClick={filterThisMonth}
                  className="filter-button filter-button-success"
                >
                  {t.refuels.thisMonth}
                </button>
                <button
                  onClick={filterThisYear}
                  className="filter-button filter-button-accent"
                >
                  {t.refuels.thisYear}
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
        {/* Statistics Section */}
        <RefuelStats
          statistics={statistics}
          refuelData={refuels}
          loading={statsLoading}
        />

        {/* Filter Options */}
        <div className="filter-container flex justify-between items-center">
          <h3 className="filter-title">{t.refuels.filter}</h3>
          <div className="filter-buttons">
            <button
              onClick={showAll}
              className="filter-button filter-button-primary"
            >
              {t.refuels.showAll}
            </button>
            <button
              onClick={filterThisMonth}
              className="filter-button filter-button-success"
            >
              {t.refuels.thisMonth}
            </button>
            <button
              onClick={filterThisYear}
              className="filter-button filter-button-accent"
            >
              {t.refuels.thisYear}
            </button>
          </div>
        </div>

        {/* Refuel Entries */}
        <RefuelList refuels={refuels} loading={loading} />
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
