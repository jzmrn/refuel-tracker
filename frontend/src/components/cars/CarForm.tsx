import React, { useState, useEffect } from "react";
import {
  Car,
  CarCreate,
  CarUpdate,
  UserSearchResult,
  apiService,
} from "../../lib/api";
import { useTranslation } from "../../lib/i18n/LanguageContext";
import DeleteIcon from "@mui/icons-material/Delete";

interface CarFormProps {
  car?: Car; // If provided, form is in edit mode
  onSuccess: () => void;
  onCancel?: () => void;
  onError: (message: string) => void;
  showCard?: boolean; // Whether to wrap form in card styling
}

const CarForm: React.FC<CarFormProps> = ({
  car,
  onSuccess,
  onCancel,
  onError,
  showCard = true,
}) => {
  const { t } = useTranslation();
  const isEditMode = !!car;

  const [formData, setFormData] = useState({
    name: car?.name || "",
    year: car?.year || undefined,
    fuel_tank_size: car?.fuel_tank_size || undefined,
    notes: car?.notes || "",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [sharedUserIds, setSharedUserIds] = useState<string[]>([]);
  const [sharedUsersDetails, setSharedUsersDetails] = useState<
    Array<{ id: string; name: string; email: string }>
  >([]);
  const [searching, setSearching] = useState(false);

  // Initialize shared users from car data
  useEffect(() => {
    if (car && car.is_owner) {
      const userIds = car.shared_users.map((u) => u.user_id);
      const userDetails = car.shared_users.map((u) => ({
        id: u.user_id,
        name: u.user_name,
        email: u.user_email,
      }));
      setSharedUserIds(userIds);
      setSharedUsersDetails(userDetails);
    }
  }, [car]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isEditMode && car) {
        const updateData: CarUpdate = {
          ...formData,
          shared_user_ids: sharedUserIds,
        };
        await apiService.updateCar(car.id, updateData);
      } else {
        const createData: CarCreate = {
          name: formData.name,
          year: formData.year!,
          fuel_tank_size: formData.fuel_tank_size!,
          notes: formData.notes,
          shared_user_ids: sharedUserIds,
        };
        await apiService.createCar(createData);
      }

      onSuccess();

      // Reset form if not in edit mode
      if (!isEditMode) {
        setFormData({
          name: "",
          year: undefined,
          fuel_tank_size: undefined,
          notes: "",
        });
        setSharedUserIds([]);
        setSharedUsersDetails([]);
      }
    } catch (error: any) {
      console.error("Error saving car:", error);
      onError(
        error.response?.data?.detail ||
          (isEditMode ? t.cars.failedToUpdateCar : t.cars.failedToCreateCar),
      );
    }
  };

  const handleClear = () => {
    setFormData({
      name: "",
      year: undefined,
      fuel_tank_size: undefined,
      notes: "",
    });
    setSharedUserIds([]);
    setSharedUsersDetails([]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const results = await apiService.searchUsers(query);
      // Filter out already selected users
      const filtered = results.filter((u) => !sharedUserIds.includes(u.id));
      setSearchResults(filtered);
    } catch (error: any) {
      console.error("Error searching users:", error);
      onError("Failed to search users");
    } finally {
      setSearching(false);
    }
  };

  const handleAddUser = (user: UserSearchResult) => {
    setSharedUserIds([...sharedUserIds, user.id]);
    setSharedUsersDetails([
      ...sharedUsersDetails,
      { id: user.id, name: user.name, email: user.email },
    ]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleRemoveUser = (userId: string) => {
    setSharedUserIds(sharedUserIds.filter((id) => id !== userId));
    setSharedUsersDetails(sharedUsersDetails.filter((u) => u.id !== userId));
  };

  return (
    <div className={showCard ? "card" : "p-6"}>
      {showCard && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {isEditMode ? t.cars.editCar : t.cars.addNewCar}
        </h3>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Car Information */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
            Car Details
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t.common.name} *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="input"
                placeholder={t.cars.carNamePlaceholder}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t.cars.year} *
              </label>
              <input
                type="number"
                value={formData.year || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    year: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                className="input"
                placeholder={t.cars.yearPlaceholder}
                min="1900"
                max="2100"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Fuel Tank Size (L) *
              </label>
              <input
                type="number"
                value={formData.fuel_tank_size || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    fuel_tank_size: e.target.value
                      ? parseFloat(e.target.value)
                      : undefined,
                  })
                }
                className="input"
                placeholder="e.g., 50"
                min="0.1"
                step="0.1"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t.cars.notes}
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                className="input"
                placeholder={t.cars.notesPlaceholder}
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Sharing Section - Only shown if not editing a shared car */}
        {(!isEditMode || (car && car.is_owner)) && (
          <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Share with Others
            </h4>

            {/* Search Users */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search for users to share with
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="input"
                placeholder="Search by name or email..."
              />

              {searching && (
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Searching...
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700 max-h-48 overflow-y-auto">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                      onClick={() => handleAddUser(user)}
                    >
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {user.name}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {user.email}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddUser(user)}
                        className="btn-primary btn-sm"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Shared Users List */}
            {sharedUsersDetails.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Shared with ({sharedUsersDetails.length})
                </label>
                <div className="space-y-2">
                  {sharedUsersDetails.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {user.name}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {user.email}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveUser(user.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Remove access"
                      >
                        <DeleteIcon className="icon-sm" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Form Actions */}
        <div className="flex gap-2 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
          {onCancel && (
            <button type="button" onClick={onCancel} className="btn-secondary">
              {t.cars.cancel}
            </button>
          )}
          {!isEditMode && (
            <button
              type="button"
              onClick={handleClear}
              className="btn-secondary"
            >
              {t.cars.clear}
            </button>
          )}
          <button type="submit" className="btn-primary">
            {isEditMode ? t.cars.updateCar : t.cars.addCar}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CarForm;
