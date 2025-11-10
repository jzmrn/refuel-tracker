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
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      showError(`Failed to load data: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTimeSpan = async (spanData: TimeSpanCreate) => {
    try {
      await apiService.createTimeSpan(spanData);
      setRefreshTrigger((prev) => prev + 1);

      showSuccess("Time span added successfully!");

      // Close mobile form and switch to values tab to show the newly added entry
      setIsMobileFormOpen(false);
      setActiveTab("values");
      // Set the selected group to the newly added span's group
      setValuesSelectedGroup(spanData.group);
    } catch (error) {
      console.error("Error adding time span:", error);
      showError("Failed to add time span.");
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
      showSuccess("Time span updated successfully!");
    } catch (error) {
      console.error("Error updating time span:", error);
      showError("Failed to update time span.");
    }
  };

  const confirmDeleteTimeSpan = async () => {
    if (!deletingSpan) return;

    try {
      await apiService.deleteTimeSpan(deletingSpan.id);
      setRefreshTrigger((prev) => prev + 1);
      setDeletingSpan(null);
      showSuccess("Time span deleted successfully!");
    } catch (error) {
      console.error("Error deleting time span:", error);
      showError("Failed to delete time span.");
      setDeletingSpan(null);
    }
  };

  const tabs = [
    { id: "add" as TabType, label: "Add Time Span", icon: "⏱️" },
    { id: "statistics" as TabType, label: "Statistics", icon: "📊" },
    { id: "values" as TabType, label: "All Values", icon: "📋" },
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
        return (
          <TimeSpanStatistics
            timeSpans={timeSpans}
            label="All Time Spans"
            loading={loading}
          />
        );
      case "values":
        return (
          <div>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <SummaryCard
                title="Unique Labels"
                value={{ value: summary?.unique_labels || 0 }}
                loading={loading}
                iconBgColor="purple"
                icon={<TagIcon size="lg" color="purple" />}
              />

              <SummaryCard
                title="Total Entries"
                value={{ value: summary?.total_entries || 0 }}
                loading={loading}
                iconBgColor="blue"
                icon={<ClockIcon size="lg" color="blue" />}
              />
            </div>

            {existingGroups.length > 0 && (
              <div className="mb-6 panel">
                <label htmlFor="values-group-select" className="label">
                  Filter by Group
                </label>
                <select
                  id="values-group-select"
                  value={valuesSelectedGroup}
                  onChange={(e) => setValuesSelectedGroup(e.target.value)}
                  className="input"
                >
                  <option value="">All Groups</option>
                  {existingGroups.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {editingSpan ? (
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
            )}
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
          <h1 className="heading-1">Time Spans</h1>
          <p className="text-secondary mt-2 text-sm md:text-base">
            Track activities and events with start and end dates
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
            value={{ value: summary?.unique_labels || 0 }}
            loading={loading}
            iconBgColor="purple"
            icon={<TagIcon size="lg" color="purple" />}
          />

          <SummaryCard
            title="Entries"
            value={{ value: summary?.total_entries || 0 }}
            loading={loading}
            iconBgColor="blue"
            icon={<ClockIcon size="lg" color="blue" />}
          />
        </div>

        {/* Statistics Section */}
        <TimeSpanStatistics
          timeSpans={timeSpans}
          label="All Time Spans"
          loading={loading}
        />

        {/* Time Spans List */}
        {existingGroups.length > 0 && (
          <div>
            <div className="mb-4 panel">
              <label htmlFor="mobile-values-group-select" className="label">
                Filter by Group
              </label>
              <select
                id="mobile-values-group-select"
                value={valuesSelectedGroup}
                onChange={(e) => setValuesSelectedGroup(e.target.value)}
                className="input"
              >
                <option value="">All Groups</option>
                {existingGroups.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </div>

            {editingSpan ? (
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
            )}
          </div>
        )}

        {existingGroups.length === 0 && !loading && (
          <div className="panel">
            <div className="text-center py-8 text-secondary">
              <p>No time spans yet.</p>
              <p className="text-sm mt-1">
                Add your first time span using the + button below.
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
        <AddTimeSpanForm
          onSubmit={handleAddTimeSpan}
          existingLabels={existingLabels}
          existingGroups={existingGroups}
        />
      </FloatingActionButton>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!deletingSpan}
        title="Delete Time Span"
        message={`Are you sure you want to delete this time span "${deletingSpan?.label}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
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
