import React, { useState, useEffect } from "react";
import { NextPage } from "next";
import CarForm from "../components/cars/CarForm";
import CarsTab from "../components/cars/CarsTab";
import Snackbar from "../components/common/Snackbar";
import FloatingActionButton from "../components/common/FloatingActionButton";
import { useSnackbar } from "../lib/useSnackbar";
import { useTranslation } from "../lib/i18n/LanguageContext";
import { apiService, Car } from "../lib/api";

type TabType = "add" | "cars";

const CarsPage: NextPage = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>("add");
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobileFormOpen, setIsMobileFormOpen] = useState(false);
  const { snackbar, showSuccess, showError, hideSnackbar } = useSnackbar();

  // Fetch cars
  const fetchCars = async () => {
    try {
      setLoading(true);
      const data = await apiService.getCars();
      setCars(data);
    } catch (error: any) {
      console.error("Error fetching cars:", error);
      showError(t.cars.failedToLoadCars);
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchCars();
  }, []);

  const handleCarAdded = () => {
    showSuccess(t.cars.carAddedSuccess);
    setIsMobileFormOpen(false);
    fetchCars();
  };

  const handleCarUpdated = () => {
    showSuccess(t.cars.carUpdatedSuccess);
    fetchCars();
  };

  const handleCarDeleted = () => {
    showSuccess(t.cars.carDeletedSuccess);
    fetchCars();
  };

  const tabs = [
    { id: "add" as TabType, label: t.cars.addCar, icon: "+" },
    { id: "cars" as TabType, label: "Cars", icon: "🚗" },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "add":
        return <CarForm onSuccess={handleCarAdded} onError={showError} />;
      case "cars":
        return (
          <CarsTab
            cars={cars}
            loading={loading}
            onCarUpdated={handleCarUpdated}
            onCarDeleted={handleCarDeleted}
            onError={showError}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 md:py-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {t.cars.title}
        </h1>
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
          {t.cars.description}
        </p>
      </div>

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
        <CarsTab
          cars={cars}
          loading={loading}
          onCarUpdated={handleCarUpdated}
          onCarDeleted={handleCarDeleted}
          onError={showError}
        />
      </div>

      {/* Floating Action Button for Mobile */}
      <FloatingActionButton
        onAddClick={() => setIsMobileFormOpen(true)}
        isOpen={isMobileFormOpen}
        onClose={() => setIsMobileFormOpen(false)}
      >
        <CarForm onSuccess={handleCarAdded} onError={showError} />
      </FloatingActionButton>

      {/* Snackbar for notifications */}
      {snackbar.isVisible && (
        <Snackbar
          message={snackbar.message}
          type={snackbar.type}
          onClose={hideSnackbar}
          isVisible={true}
        />
      )}
    </div>
  );
};

export default CarsPage;
