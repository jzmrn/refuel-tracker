import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckIcon from "@mui/icons-material/Check";
import AddIcon from "@mui/icons-material/Add";
import CircularProgress from "@mui/material/CircularProgress";
import Panel from "@/components/common/Panel";
import { StackLayout } from "@/components/common";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useShareCar } from "@/lib/hooks/useCars";
import { UserSearchResult, apiService } from "@/lib/api";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { Car } from "@/lib/api";

interface ShareCarContentProps {
  car: Car;
  onSuccess: () => void;
  onError: (message: string) => void;
}

export default function ShareCarContent({
  car,
  onSuccess,
  onError,
}: ShareCarContentProps) {
  const { t } = useTranslation();
  const shareCar = useShareCar();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<UserSearchResult[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debounce search query to avoid too many API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const shouldSearch = debouncedSearchQuery.trim().length >= 3;
  const isTyping = searchQuery !== debouncedSearchQuery;

  // Use React Query for search results with 1-minute cache
  const {
    data: searchResults = [],
    isFetching: searching,
    error: searchError,
  } = useQuery({
    queryKey: ["searchUsers", debouncedSearchQuery],
    queryFn: () => apiService.searchUsers(debouncedSearchQuery),
    enabled: shouldSearch,
    staleTime: 60000, // Cache valid for 1 minute
  });

  // Determine if we should show loading state
  const isSearching = shouldSearch && (searching || isTyping);

  // Filter out already shared users and already selected users
  const filteredSearchResults = useMemo(() => {
    // Don't show old results while typing a new query
    if (!shouldSearch || isTyping) return [];
    const existingUserIds = car?.shared_users?.map((u) => u.user_id) || [];
    const selectedUserIds = selectedUsers.map((u) => u.id);
    return searchResults.filter(
      (user) =>
        !existingUserIds.includes(user.id) &&
        !selectedUserIds.includes(user.id),
    );
  }, [searchResults, car?.shared_users, selectedUsers, shouldSearch, isTyping]);

  // Handle search errors
  useEffect(() => {
    if (searchError) {
      console.error("Error searching users:", searchError);
      onError(t.cars.failedToSearchUsers);
    }
  }, [searchError, onError, t.cars.failedToSearchUsers]);

  const handleSelectUser = (user: UserSearchResult) => {
    if (!selectedUsers.find((u) => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleRemoveSelectedUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter((u) => u.id !== userId));
  };

  const handleSubmit = async () => {
    if (!car.id || selectedUsers.length === 0) return;

    try {
      setIsSubmitting(true);
      // Share car with all selected users
      await Promise.all(
        selectedUsers.map((user) =>
          shareCar.mutateAsync({ carId: car.id, userId: user.id }),
        ),
      );
      onSuccess();
    } catch (error: any) {
      console.error("Error sharing car:", error);
      onError(error.response?.data?.detail || t.cars.failedToShareCar);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StackLayout className="max-w-2xl mx-auto">
      {/* Search Section */}
      <Panel title={t.cars.searchUsers}>
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
                className={`input w-full ${isSearching ? "pr-10" : ""}`}
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-600 dark:text-primary-400">
                  <CircularProgress size={16} color="inherit" />
                </div>
              )}
            </div>
            <p className="text-secondary text-xs mt-1">
              {t.cars.typeAtLeastThreeChars}
            </p>
          </div>

          {/* Search Results */}
          {filteredSearchResults.length > 0 && (
            <div className="space-y-2">
              {filteredSearchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-300 dark:border-gray-600"
                >
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {user.name}
                    </div>
                    <div className="text-sm text-secondary">{user.email}</div>
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

          {/* Loading state - show when searching to avoid flickering */}
          {shouldSearch &&
            isSearching &&
            filteredSearchResults.length === 0 && (
              <p className="text-secondary text-sm">{t.common.loading}</p>
            )}

          {/* No results - only show when not searching */}
          {shouldSearch &&
            !isSearching &&
            filteredSearchResults.length === 0 && (
              <p className="text-secondary text-sm">{t.cars.noUsersFound}</p>
            )}
        </div>
      </Panel>

      {/* Selected Users Section */}
      <SelectedUsersPanel
        selectedUsers={selectedUsers}
        isSubmitting={isSubmitting}
        onRemoveUser={handleRemoveSelectedUser}
        onSubmit={handleSubmit}
      />
    </StackLayout>
  );
}

interface SelectedUsersPanelProps {
  selectedUsers: UserSearchResult[];
  isSubmitting: boolean;
  onRemoveUser: (userId: string) => void;
  onSubmit: () => void;
}

function SelectedUsersPanel({
  selectedUsers,
  isSubmitting,
  onRemoveUser,
  onSubmit,
}: SelectedUsersPanelProps) {
  const { t } = useTranslation();

  return (
    <Panel
      title={t.cars.selectedUsers}
      actions={<span className="heading-2">{selectedUsers.length}</span>}
    >
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
                onClick={() => onRemoveUser(user.id)}
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
        onClick={onSubmit}
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
    </Panel>
  );
}
