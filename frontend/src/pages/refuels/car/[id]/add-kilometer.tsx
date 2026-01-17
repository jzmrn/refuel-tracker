import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Panel from "@/components/common/Panel";
import Snackbar from "@/components/common/Snackbar";
import { useSnackbar } from "@/lib/useSnackbar";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import {
  useCreateKilometerEntry,
  useCarWithMinLoadTime,
} from "@/lib/hooks/useCars";
import { KilometerEntryCreate } from "@/lib/api";
import CircularProgress from "@mui/material/CircularProgress";

export default function AddKilometer() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = router.query;
  const carId = typeof id === "string" ? id : undefined;

  const { data: car, isLoading: carLoading } = useCarWithMinLoadTime(carId);
  const createKilometerEntry = useCreateKilometerEntry();
  const { snackbar, showError, hideSnackbar } = useSnackbar();

  const [formData, setFormData] = useState<{
    car_id: string;
    total_kilometers: number;
    timestamp: string;
  }>({
    car_id: carId || "",
    total_kilometers: 0,
    timestamp: new Date().toISOString().slice(0, 16),
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update car_id when carId changes
  useEffect(() => {
    if (carId) {
      setFormData((prev) => ({ ...prev, car_id: carId }));
    }
  }, [carId]);

  const handleBack = () => {
    router.back();
  };

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      const submissionData: KilometerEntryCreate = {
        car_id: formData.car_id,
        total_kilometers: formData.total_kilometers,
        timestamp: formData.timestamp
          ? new Date(formData.timestamp).toISOString()
          : new Date().toISOString(),
      };
      await createKilometerEntry.mutateAsync(submissionData);

      // Navigate back
      router.push(`/refuels/car/${carId}`);
    } catch (error: any) {
      console.error("Error creating kilometer entry:", error);
      showError(error.response?.data?.detail || t.kilometers.errorAddingEntry);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 md:py-8">
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
            <h1 className="heading-1">{t.kilometers.addKilometer}</h1>
            {car && (
              <p className="text-secondary mt-1 text-sm">
                {car.name} ({car.year})
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Form */}
      {carLoading ? (
        <Panel>
          <div className="flex flex-col items-center gap-2">
            <CircularProgress size={20} />
            <span className="text-secondary">{t.common.loading}</span>
          </div>
        </Panel>
      ) : (
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit}>
            <Panel>
              <div className="form-container">
                {/* Timestamp */}
                <div className="form-group">
                  <label htmlFor="timestamp" className="label">
                    {t.forms.dateTime} *
                  </label>
                  <input
                    type="datetime-local"
                    id="timestamp"
                    name="timestamp"
                    value={formData.timestamp}
                    onChange={handleChange}
                    className={`input ${
                      errors.timestamp ? "border-red-500" : ""
                    }`}
                    max={new Date().toISOString().slice(0, 16)}
                    required
                  />
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
                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 justify-end">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="btn-secondary w-full sm:w-auto"
                    disabled={isSubmitting}
                  >
                    {t.common.cancel}
                  </button>
                  <button
                    type="submit"
                    className="btn-primary w-full sm:w-auto"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center gap-2">
                        <CircularProgress size={16} color="inherit" />
                        {t.common.saving}
                      </div>
                    ) : (
                      t.navigation.addEntry
                    )}
                  </button>
                </div>
              </div>
            </Panel>
          </form>
        </div>
      )}

      {/* Snackbar */}
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
}
