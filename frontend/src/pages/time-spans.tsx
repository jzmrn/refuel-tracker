import { useState, useEffect } from "react";
import { format } from "date-fns";
import AddTimeSpanForm from "@/components/time-spans/AddTimeSpanForm";
import EditTimeSpanForm from "@/components/time-spans/EditTimeSpanForm";
import TimeSpanList from "@/components/time-spans/TimeSpanList";
import TimeSpanStatistics from "@/components/time-spans/TimeSpanStatistics";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import Snackbar from "@/components/common/Snackbar";
import FloatingActionButton from "@/components/common/FloatingActionButton";
import SummaryCard from "@/components/common/SummaryCard";
import { TagIcon, ClockIcon } from "@/components/common/Icons";
import { useSnackbar } from "@/lib/useSnackbar";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import apiService, {
  TimeSpanResponse,
  TimeSpanCreate,
  TimeSpanUpdate,
  TimeSpanSummaryResponse,
} from "@/lib/api";

// Type aliases for easier usage
export type TimeSpan = TimeSpanResponse;
export type TimeSpanSummary = TimeSpanSummaryResponse;
type TabType = "add" | "statistics" | "values";

export default function TimeSpans() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>("add");
  const [valuesSelectedGroup, setValuesSelectedGroup] = useState<string>("");
  const [timeSpans, setTimeSpans] = useState<TimeSpan[]>([]);
  const [filteredTimeSpans, setFilteredTimeSpans] = useState<TimeSpan[]>([]);
  const [existingLabels, setExistingLabels] = useState<string[]>([]);
  const [existingGroups, setExistingGroups] = useState<string[]>([]);
  const [summary, setSummary] = useState<TimeSpanSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingSpan, setDeletingSpan] = useState<TimeSpan | null>(null);
  const [editingSpan, setEditingSpan] = useState<TimeSpan | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isMobileFormOpen, setIsMobileFormOpen] = useState(false);
  const { snackbar, showSuccess, showError, hideSnackbar } = useSnackbar();

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  useEffect(() => {
    // Filter time spans for values tab
    if (valuesSelectedGroup && valuesSelectedGroup !== "") {
      const filtered = timeSpans.filter(
        (span) => span.group === valuesSelectedGroup,
      );
      setFilteredTimeSpans(filtered);
    } else {
      setFilteredTimeSpans(timeSpans);
    }
  }, [valuesSelectedGroup, timeSpans]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [spansData, labelsData, groupsData, summaryData] =
        await Promise.all([
          apiService.getTimeSpans({ limit: 100 }), // Get recent 100 entries
          apiService.getExistingTimeSpanLabels(),
          apiService.getExistingTimeSpanGroups(),
          apiService.getTimeSpanSummary(),
        ]);

      setTimeSpans(spansData);
      setExistingLabels(labelsData);
      setExistingGroups(groupsData);
      setSummary(summaryData);

      // Set default selected group for values tab if none selected
      if (!valuesSelectedGroup && groupsData.length > 0) {
        // Values tab starts with "All Groups" selected (empty string)
        setValuesSelectedGroup("");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      showError(t.timeSpans.failedToLoad);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTimeSpan = async (spanData: TimeSpanCreate) => {
    try {
      await apiService.createTimeSpan(spanData);
      setRefreshTrigger((prev) => prev + 1);

      showSuccess(t.timeSpans.addedSuccessfully);

      // Close mobile form and switch to values tab to show the newly added entry
      setIsMobileFormOpen(false);
      setActiveTab("values");
      // Set the selected group to the newly added span's group
      setValuesSelectedGroup(spanData.group);
    } catch (error) {
      console.error("Error adding time span:", error);
      showError(t.timeSpans.failedToAdd);
    }
  };

  const handleDeleteTimeSpan = (span: TimeSpan) => {
    setDeletingSpan(span);
  };

  const handleEditTimeSpan = (span: TimeSpan) => {
    setEditingSpan(span);
  };

  const handleUpdateTimeSpan = async (id: string, update: TimeSpanUpdate) => {
    try {
      await apiService.updateTimeSpan(id, update);
      setRefreshTrigger((prev) => prev + 1);
      setEditingSpan(null);
      showSuccess(t.timeSpans.updatedSuccessfully);
    } catch (error) {
      console.error("Error updating time span:", error);
      showError(t.timeSpans.failedToUpdate);
    }
  };

  const confirmDeleteTimeSpan = async () => {
    if (!deletingSpan) return;

    try {
      await apiService.deleteTimeSpan(deletingSpan.id);
      setRefreshTrigger((prev) => prev + 1);
      setDeletingSpan(null);
      showSuccess(t.timeSpans.deletedSuccessfully);
    } catch (error) {
      console.error("Error deleting time span:", error);
      showError(t.timeSpans.failedToDelete);
      setDeletingSpan(null);
    }
  };

  // Reusable component functions
  const renderSummaryCards = (
    gridCols: string = "grid-cols-1 md:grid-cols-2",
  ) => (
    <div className={`grid ${gridCols} gap-6 mb-8`}>
      <SummaryCard
        title={t.timeSpans.uniqueLabels}
        value={{ value: summary?.unique_labels || 0 }}
        loading={loading}
        iconBgColor="purple"
        icon={<TagIcon size="lg" color="purple" />}
      />

      <SummaryCard
        title={t.timeSpans.totalEntries}
        value={{ value: summary?.total_entries || 0 }}
        loading={loading}
        iconBgColor="blue"
        icon={<ClockIcon size="lg" color="blue" />}
      />
    </div>
  );

  const renderGroupFilter = (id: string, isMobile: boolean = false) =>
    existingGroups.length > 0 && (
      <div className={`${isMobile ? "mb-4" : "mb-6"} panel`}>
        <div className="flex items-center gap-4">
          <label htmlFor={id} className="label flex-shrink-0">
            {t.timeSpans.filterByGroup}
          </label>
          <select
            id={id}
            value={valuesSelectedGroup}
            onChange={(e) => setValuesSelectedGroup(e.target.value)}
            className="input flex-1"
          >
            <option value="">{t.timeSpans.allGroups}</option>
            {existingGroups.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </div>
      </div>
    );

  const renderTimeSpanListWithEdit = () =>
    editingSpan ? (
      <EditTimeSpanForm
        timeSpan={editingSpan}
        onSubmit={handleUpdateTimeSpan}
        existingLabels={existingLabels}
        existingGroups={existingGroups}
        onCancel={() => setEditingSpan(null)}
      />
    ) : (
      <TimeSpanList
        timeSpans={filteredTimeSpans}
        onDelete={handleDeleteTimeSpan}
        onEdit={handleEditTimeSpan}
        loading={loading}
      />
    );

  const renderStatistics = () => (
    <TimeSpanStatistics
      timeSpans={timeSpans}
      label={t.timeSpans.allTimeSpans}
      loading={loading}
    />
  );

  const tabs = [
    { id: "add" as TabType, label: t.timeSpans.addTimeSpan, icon: "⏱️" },
    { id: "statistics" as TabType, label: t.timeSpans.statistics, icon: "📊" },
    { id: "values" as TabType, label: t.timeSpans.allValues, icon: "📋" },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "add":
        return (
          <AddTimeSpanForm
            onSubmit={handleAddTimeSpan}
            existingLabels={existingLabels}
            existingGroups={existingGroups}
          />
        );
      case "statistics":
        return renderStatistics();
      case "values":
        return (
          <div>
            {/* Summary Cards */}
            {renderSummaryCards()}

            {renderGroupFilter("values-group-select")}

            {renderTimeSpanListWithEdit()}
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
          <h1 className="heading-1">{t.timeSpans.title}</h1>
          <p className="text-secondary mt-2 text-sm md:text-base">
            {t.timeSpans.trackActivities}
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
        {renderSummaryCards("grid-cols-2")}

        {/* Statistics Section */}
        {renderStatistics()}

        {/* Time Spans List */}
        <div>
          {renderGroupFilter("mobile-values-group-select", true)}
          {renderTimeSpanListWithEdit()}
        </div>
      </div>

      {/* Floating Action Button for Mobile */}
      <FloatingActionButton
        onAddClick={() => setIsMobileFormOpen(true)}
        isOpen={isMobileFormOpen}
        onClose={() => setIsMobileFormOpen(false)}
      >
        <AddTimeSpanForm
          onSubmit={handleAddTimeSpan}
          existingLabels={existingLabels}
          existingGroups={existingGroups}
        />
      </FloatingActionButton>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!deletingSpan}
        title={t.timeSpans.deleteTimeSpan}
        message={t.timeSpans.deleteConfirmMessage}
        confirmText={t.common.delete}
        cancelText={t.common.cancel}
        variant="danger"
        onConfirm={confirmDeleteTimeSpan}
        onCancel={() => setDeletingSpan(null)}
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
