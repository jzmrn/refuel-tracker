import { useState, useMemo, useCallback } from "react";
import Panel from "@/components/common/Panel";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import {
  KilometerEntry,
  KilometerEntryCreate,
  KilometerEntryUpdate,
} from "@/lib/api";
import { getLocalDateTimeString } from "@/lib/dateUtils";
import { Car } from "@/lib/api";
import CircularProgress from "@mui/material/CircularProgress";

// Convert ISO timestamp to local datetime string for input
function isoToLocalDateTimeString(isoString: string): string {
  const date = new Date(isoString);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

interface FormData {
  total_kilometers: number;
  timestamp: string;
}

interface DistanceFormBaseProps {
  carId: string;
  car: Car | null | undefined;
  isSubmitting: boolean;
  onCancel: () => void;
}

interface DistanceFormAddProps extends DistanceFormBaseProps {
  mode: "add";
  initialData?: undefined;
  onSubmit: (data: KilometerEntryCreate) => Promise<void>;
  onDelete?: never;
}

interface DistanceFormEditProps extends DistanceFormBaseProps {
  mode: "edit";
  initialData: KilometerEntry;
  onSubmit: (data: KilometerEntryUpdate) => Promise<void>;
  onDelete?: () => void;
}

type DistanceFormProps = DistanceFormAddProps | DistanceFormEditProps;

export default function DistanceForm({
  mode,
  carId,
  car,
  initialData,
  isSubmitting,
  onSubmit,
  onCancel,
  ...rest
}: DistanceFormProps) {
  const onDelete =
    mode === "edit" ? (rest as DistanceFormEditProps).onDelete : undefined;
  const { t } = useTranslation();

  const isEditMode = mode === "edit";

  // Initialize form data
  const getInitialFormData = useCallback((): FormData => {
    if (initialData) {
      return {
        total_kilometers: initialData.total_kilometers,
        timestamp: isoToLocalDateTimeString(initialData.timestamp),
      };
    }
    return {
      total_kilometers: 0,
      timestamp: getLocalDateTimeString(),
    };
  }, [initialData]);

  const [formData, setFormData] = useState<FormData>(getInitialFormData);
  const [originalData] = useState<FormData>(getInitialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Check if form has changes (for edit mode)
  const hasChanges = useMemo(() => {
    if (!isEditMode) return true;
    return formData.total_kilometers !== originalData.total_kilometers;
  }, [formData.total_kilometers, originalData.total_kilometers, isEditMode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    let processedValue: string | number = value;
    if (name === "total_kilometers") {
      processedValue = parseFloat(value) || 0;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: processedValue,
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.total_kilometers || formData.total_kilometers <= 0) {
      newErrors.total_kilometers = t.kilometers.kilometersPositive;
    }

    // Only validate timestamp in add mode
    if (!isEditMode) {
      if (formData.timestamp) {
        const selectedDate = new Date(formData.timestamp);
        const now = new Date();
        if (isNaN(selectedDate.getTime())) {
          newErrors.timestamp = t.kilometers.invalidDateFormat;
        } else if (selectedDate > now) {
          newErrors.timestamp = t.kilometers.dateCannotBeFuture;
        }
      } else {
        newErrors.timestamp = t.kilometers.dateTimeRequired;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (isEditMode && initialData) {
      // Build update data - only include changed fields
      const updateData: KilometerEntryUpdate = {
        timestamp: initialData.timestamp, // Original timestamp for lookup
        car_id: carId,
      };

      if (formData.total_kilometers !== originalData.total_kilometers) {
        updateData.total_kilometers = formData.total_kilometers;
      }

      await onSubmit(updateData);
    } else {
      // Create data
      const createData: KilometerEntryCreate = {
        car_id: carId,
        total_kilometers: formData.total_kilometers,
        timestamp: formData.timestamp
          ? new Date(formData.timestamp).toISOString()
          : new Date().toISOString(),
      };

      await onSubmit(createData);
    }
  };

  // Format date for display in edit mode
  const formatDisplayDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="max-w-3xl mx-auto">
      <form onSubmit={handleSubmit}>
        <Panel>
          <div className="form-container">
            {/* Timestamp - editable only in add mode */}
            <div className="form-group">
              <label htmlFor="timestamp" className="label">
                {t.forms.dateTime} {!isEditMode && "*"}
              </label>
              {isEditMode ? (
                <div className="input bg-gray-100 dark:bg-gray-700 cursor-not-allowed">
                  {initialData && formatDisplayDate(initialData.timestamp)}
                </div>
              ) : (
                <input
                  type="datetime-local"
                  id="timestamp"
                  name="timestamp"
                  value={formData.timestamp}
                  onChange={handleChange}
                  className={`input ${
                    errors.timestamp ? "border-red-500" : ""
                  }`}
                  max={getLocalDateTimeString()}
                  required
                />
              )}
              {errors.timestamp && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.timestamp}
                </p>
              )}
            </div>

            {/* Total Kilometers */}
            <div className="form-group">
              <label htmlFor="total_kilometers" className="label">
                {t.kilometers.totalKilometersForm} *
              </label>
              <input
                type="number"
                id="total_kilometers"
                name="total_kilometers"
                value={formData.total_kilometers || ""}
                onChange={handleChange}
                className={`input ${
                  errors.total_kilometers ? "border-red-500" : ""
                }`}
                step="1"
                min="1"
                required
              />
              {errors.total_kilometers && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.total_kilometers}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              {/* Delete button - only in edit mode with onDelete handler */}
              {isEditMode && onDelete && (
                <div className="order-3 sm:order-1 mt-3 sm:mt-0">
                  <button
                    type="button"
                    onClick={onDelete}
                    className="btn-danger w-full sm:w-auto"
                    disabled={isSubmitting}
                  >
                    {t.common.delete}
                  </button>
                </div>
              )}

              {/* Spacer for desktop - pushes cancel and save to the right */}
              <div className="hidden sm:flex sm:flex-1 sm:order-2" />

              {/* Cancel and Save buttons - right aligned on desktop */}
              <div className="flex flex-col sm:flex-row gap-3 order-1 sm:order-3">
                <button
                  type="submit"
                  className={`btn-primary w-full sm:w-auto order-1 sm:order-2 ${
                    isEditMode && !hasChanges
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                  disabled={isSubmitting || (isEditMode && !hasChanges)}
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <CircularProgress size={16} color="inherit" />
                      {t.common.saving}
                    </div>
                  ) : isEditMode ? (
                    t.common.save
                  ) : (
                    t.navigation.addEntry
                  )}
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  className="btn-secondary w-full sm:w-auto order-2 sm:order-1"
                  disabled={isSubmitting}
                >
                  {t.common.cancel}
                </button>
              </div>
            </div>
          </div>
        </Panel>
      </form>
    </div>
  );
}
