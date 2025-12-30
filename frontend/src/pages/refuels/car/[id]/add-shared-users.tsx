import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckIcon from "@mui/icons-material/Check";
import AddIcon from "@mui/icons-material/Add";
import PageTransition from "@/components/common/PageTransition";
import Snackbar from "@/components/common/Snackbar";
import { useSnackbar } from "@/lib/useSnackbar";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { usePathAnimation } from "@/lib/hooks/usePathAnimation";
import { useCarWithMinLoadTime, useShareCar } from "@/lib/hooks/useCars";
import { UserSearchResult, apiService } from "@/lib/api";
import CircularProgress from "@mui/material/CircularProgress";

export default function AddSharedUsers() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = router.query;
  const carId = typeof id === "string" ? id : undefined;

  const { isVisible, animationDirection, navigateBackWithAnimation } =
    usePathAnimation({
      currentPath: `/refuels/car/${id || ""}/add-shared-users`,
    });

  const {
    data: car,
    isLoading: carLoading,
    error: carError,
  } = useCarWithMinLoadTime(carId);

  const shareCar = useShareCar();
  const { snackbar, showError, hideSnackbar } = useSnackbar();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBack = () => {
    navigateBackWithAnimation();
  };

  const performSearch = useCallback(
    async (query: string) => {
      if (query.trim().length < 3) {
        setSearchResults([]);
        return;
      }

      try {
        setSearching(true);
        const results = await apiService.searchUsers(query);
        // Filter out already shared users and already selected users
        const existingUserIds = car?.shared_users?.map((u) => u.user_id) || [];
        const selectedUserIds = selectedUsers.map((u) => u.id);
        const filteredResults = results.filter(
          (user) =>
            !existingUserIds.includes(user.id) &&
            !selectedUserIds.includes(user.id),
        );
        setSearchResults(filteredResults);
      } catch (error) {
        console.error("Error searching users:", error);
        showError(t.cars.failedToSearchUsers);
      } finally {
        setSearching(false);
      }
    },
    [car?.shared_users, selectedUsers, showError, t.cars.failedToSearchUsers],
  );

  // Auto-search with debounce when query has 3+ characters
  useEffect(() => {
    if (searchQuery.trim().length < 3) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    // Show loading immediately when typing 3+ chars
    setSearching(true);

    const timeoutId = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, performSearch]);

  const handleSelectUser = (user: UserSearchResult) => {
    if (!selectedUsers.find((u) => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
      // Remove from search results
      setSearchResults(searchResults.filter((u) => u.id !== user.id));
    }
  };

  const handleRemoveSelectedUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter((u) => u.id !== userId));
  };

  const handleSubmit = async () => {
    if (!carId || selectedUsers.length === 0) return;

    try {
      setIsSubmitting(true);
      // Share car with all selected users
      await Promise.all(
        selectedUsers.map((user) =>
          shareCar.mutateAsync({ carId, userId: user.id }),
        ),
      );
      // Navigate back to car details
      router.push(`/refuels/car/${carId}`);
    } catch (error: any) {
      console.error("Error sharing car:", error);
      showError(error.response?.data?.detail || t.cars.failedToShareCar);
    } finally {
      setIsSubmitting(false);
    }
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
            <h1 className="heading-1">{t.cars.addSharedUsers}</h1>
            {car && (
              <p className="text-secondary text-sm mt-1">
                {car.name} ({car.year})
              </p>
            )}
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
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Search Section */}
          <div className="panel">
            <h2 className="heading-2 mb-6">{t.cars.searchUsers}</h2>
            <p className="text-secondary text-sm mb-4">
              {t.cars.selectUsersToShare}
            </p>
            <div className="form-container">
              <div className="field-group">
                <label htmlFor="userSearch" className="label">
                  {t.cars.searchUserPlaceholder}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="userSearch"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.cars.searchUserPlaceholder}
                    className={`input w-full ${searching ? "pr-10" : ""}`}
                  />
                  {searching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <CircularProgress size={16} />
                    </div>
                  )}
                </div>
                {searchQuery.length > 0 && searchQuery.length < 3 && (
                  <p className="text-secondary text-xs mt-1">
                    {t.cars.typeAtLeastThreeChars}
                  </p>
                )}
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-300 dark:border-gray-600"
                    >
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {user.name}
                        </div>
                        <div className="text-sm text-secondary">
                          {user.email}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSelectUser(user)}
                        className="p-2 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                        aria-label={t.common.add}
                      >
                        <AddIcon className="icon" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {searchQuery.length >= 3 &&
                searchResults.length === 0 &&
                !searching && (
                  <p className="text-secondary text-sm">
                    {t.cars.noUsersFound}
                  </p>
                )}
            </div>
          </div>

          {/* Selected Users Section - Always visible */}
          <div className="panel">
            <h2 className="heading-2 mb-4">
              {t.cars.selectedUsers} ({selectedUsers.length})
            </h2>
            {selectedUsers.length > 0 ? (
              <div className="space-y-3">
                {selectedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700"
                  >
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {user.name}
                      </div>
                      <div className="text-sm text-secondary">{user.email}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveSelectedUser(user.id)}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      aria-label={t.common.delete}
                    >
                      <DeleteIcon className="icon" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-secondary text-sm py-4 text-center">
                {t.cars.noUsersSelected}
              </p>
            )}

            {/* Submit Button - Always visible */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || selectedUsers.length === 0}
              className="btn-primary w-full mt-6 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <CircularProgress size={16} color="inherit" />
                  {t.common.saving}
                </>
              ) : (
                <>
                  <CheckIcon className="icon" />
                  {t.cars.addSelectedUsers}
                </>
              )}
            </button>
          </div>
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
