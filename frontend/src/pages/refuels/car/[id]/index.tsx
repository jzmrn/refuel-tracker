import { useState } from "react";
import { useRouter } from "next/router";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import PageTransition from "@/components/common/PageTransition";
import Snackbar from "@/components/common/Snackbar";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import RefuelList from "@/components/refuels/RefuelList";
import RefuelStats from "@/components/refuels/RefuelStats";
import { useSnackbar } from "@/lib/useSnackbar";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { usePathAnimation } from "@/lib/hooks/usePathAnimation";
import {
  useCarWithMinLoadTime,
  useRefuelMetricsWithMinLoadTime,
  useRefuelStatisticsWithMinLoadTime,
  useRevokeCarAccess,
} from "@/lib/hooks/useCars";
import CircularProgress from "@mui/material/CircularProgress";

type FilterType = "all" | "month" | "year";

export default function CarDetails() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = router.query;
  const carId = typeof id === "string" ? id : undefined;

  const {
    isVisible,
    animationDirection,
    navigateWithAnimation,
    navigateBackWithAnimation,
  } = usePathAnimation({ currentPath: `/refuels/car/${id || ""}` });

  // Fetch car details
  const {
    data: car,
    isLoading: carLoading,
    error: carError,
  } = useCarWithMinLoadTime(carId);

  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  // Calculate date filters
  const getFilterDates = () => {
    const now = new Date();
    let startDate: string | undefined;

    if (activeFilter === "month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate = startOfMonth.toISOString().split("T")[0];
    } else if (activeFilter === "year") {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      startDate = startOfYear.toISOString().split("T")[0];
    }

    return { start_date: startDate };
  };

  // Fetch refuels with current filter
  const { data: refuels = [], isLoading: refuelsLoading } =
    useRefuelMetricsWithMinLoadTime(carId, {
      ...getFilterDates(),
      limit: activeFilter === "all" ? 50 : 365,
    });

  // Fetch statistics (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const { data: statistics, isLoading: statsLoading } =
    useRefuelStatisticsWithMinLoadTime(carId, {
      start_date: sixMonthsAgo.toISOString().split("T")[0],
    });

  const revokeAccess = useRevokeCarAccess();
  const { snackbar, showError, showSuccess, hideSnackbar } = useSnackbar();

  const handleBack = () => {
    // Navigate explicitly to cars list to avoid history stack issues
    navigateWithAnimation("/refuels");
  };

  const handleEditCar = () => {
    navigateWithAnimation(`/refuels/car/${carId}/details`);
  };

  const handleAddRefuel = () => {
    navigateWithAnimation(`/refuels/car/${carId}/add-refuel`);
  };

  const handleAddSharedUsers = () => {
    navigateWithAnimation(`/refuels/car/${carId}/add-shared-users`);
  };

  const handleRemoveSharedUser = async (userId: string) => {
    if (!carId) return;
    try {
      await revokeAccess.mutateAsync({ carId, userId });
      showSuccess(t.cars.accessRevokedSuccess);
    } catch (error: any) {
      console.error("Error revoking access:", error);
      showError(error.response?.data?.detail || t.cars.failedToRevokeAccess);
    }
  };

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
  };

  if (carError) {
    return (
      <PageTransition
        isVisible={isVisible}
        animationDirection={animationDirection}
        className="max-w-7xl mx-auto px-4 py-4 md:py-8"
      >
        <div className="panel text-center">
          <p className="text-red-600 dark:text-red-400">
            {t.cars.failedToLoadCar}
          </p>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition
      isVisible={isVisible}
      animationDirection={animationDirection}
      className="max-w-7xl mx-auto px-4 py-4 md:py-8"
    >
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={handleBack}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={t.common.back}
          >
            <ArrowBackIcon className="icon text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex-1">
            <h1 className="heading-1">{t.cars.carDetails}</h1>
          </div>
        </div>
      </div>

      {carLoading ? (
        <div className="panel">
          <div className="flex flex-col items-center gap-2">
            <CircularProgress size={20} />
            <span className="text-secondary">{t.common.loading}</span>
          </div>
        </div>
      ) : car ? (
        <div className="space-y-6">
          {/* Car Details */}
          <div className="panel">
            <div className="flex justify-between items-start mb-4">
              <h2 className="heading-2">{car.name}</h2>
              <button
                onClick={handleEditCar}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label={t.cars.editCar}
              >
                <EditIcon className="icon text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-secondary">{t.cars.year}:</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {car.year}
                </p>
              </div>
              <div>
                <span className="text-sm text-secondary">
                  {t.cars.fuelTankSize}:
                </span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {car.fuel_tank_size} L
                </p>
              </div>
              {car.notes && (
                <div className="md:col-span-2">
                  <span className="text-sm text-secondary">
                    {t.cars.notes}:
                  </span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {car.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Shared Users Section - only show if user is owner */}
          {car.is_owner && (
            <div className="panel">
              <div className="flex justify-between items-center mb-4">
                <h2 className="heading-2">{t.cars.sharedWith}</h2>
                <button
                  onClick={handleAddSharedUsers}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label={t.cars.addSharedUsers}
                >
                  <AddIcon className="icon text-gray-600 dark:text-gray-400" />
                </button>
              </div>
              {car.shared_users && car.shared_users.length > 0 ? (
                <div className="space-y-3">
                  {car.shared_users.map((user) => (
                    <div
                      key={user.user_id}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700"
                    >
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {user.user_name}
                        </div>
                        <div className="text-sm text-secondary">
                          {user.user_email}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveSharedUser(user.user_id)}
                        disabled={revokeAccess.isPending}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                        aria-label={t.cars.removeAccess}
                      >
                        <DeleteIcon className="icon" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-secondary text-sm">
                  {t.cars.noSharedAccess}
                </p>
              )}
            </div>
          )}

          {/* Filter Options */}
          <div className="panel p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.refuels.filter}:
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleFilterChange("all")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeFilter === "all"
                      ? "bg-primary-50 text-primary-700 dark:bg-blue-900/20 dark:text-blue-300"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {t.refuels.showAll}
                </button>
                <button
                  onClick={() => handleFilterChange("month")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeFilter === "month"
                      ? "bg-primary-50 text-primary-700 dark:bg-blue-900/20 dark:text-blue-300"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {t.refuels.thisMonth}
                </button>
                <button
                  onClick={() => handleFilterChange("year")}
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

          {/* Refuel Events */}
          <div className="panel">
            <div className="flex justify-between items-center mb-4">
              <h2 className="heading-2">
                {t.refuels.refuelEntries} ({refuels.length})
              </h2>
              <button
                onClick={handleAddRefuel}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label={t.refuels.addEntry}
              >
                <AddIcon className="icon text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            <RefuelList refuels={refuels} loading={refuelsLoading} />
          </div>

          {/* Statistics */}
          <RefuelStats
            statistics={statistics || null}
            refuelData={refuels}
            loading={statsLoading}
          />
        </div>
      ) : null}

      {/* Snackbar */}
      {snackbar.isVisible && (
        <Snackbar
          message={snackbar.message}
          type={snackbar.type}
          onClose={hideSnackbar}
          isVisible={true}
        />
      )}
    </PageTransition>
  );
}
