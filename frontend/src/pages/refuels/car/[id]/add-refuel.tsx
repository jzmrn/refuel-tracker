import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PageTransition from "@/components/common/PageTransition";
import Snackbar from "@/components/common/Snackbar";
import { useSnackbar } from "@/lib/useSnackbar";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { usePathAnimation } from "@/lib/hooks/usePathAnimation";
import {
  useCreateRefuelMetric,
  useCarWithMinLoadTime,
} from "@/lib/hooks/useCars";
import {
  RefuelMetricCreate,
  FavoriteStationDropdown,
  apiService,
} from "@/lib/api";
import CircularProgress from "@mui/material/CircularProgress";

export default function AddRefuel() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = router.query;
  const carId = typeof id === "string" ? id : undefined;

  const {
    isVisible,
    animationDirection,
    navigateBackWithAnimation,
    navigateWithAnimation,
  } = usePathAnimation({ currentPath: `/refuels/car/${id || ""}/add-refuel` });

  const { data: car, isLoading: carLoading } = useCarWithMinLoadTime(carId);
  const createRefuel = useCreateRefuelMetric();
  const { snackbar, showError, hideSnackbar } = useSnackbar();

  const [formData, setFormData] = useState<RefuelMetricCreate>({
    car_id: carId || "",
    price: 0,
    amount: 0,
    kilometers_since_last_refuel: 0,
    estimated_fuel_consumption: 0,
    timestamp: new Date().toISOString().slice(0, 16),
    notes: "",
    station_id: undefined,
  });

  const [favoriteStations, setFavoriteStations] = useState<
    FavoriteStationDropdown[]
  >([]);
  const [loadingStations, setLoadingStations] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update car_id when carId changes
  useEffect(() => {
    if (carId) {
      setFormData((prev) => ({ ...prev, car_id: carId }));
    }
  }, [carId]);

  // Fetch favorite stations
  useEffect(() => {
    const fetchStations = async () => {
      try {
        setLoadingStations(true);
        const stations = await apiService.getFavoriteStationsForDropdown();
        setFavoriteStations(stations);
      } catch (error) {
        console.error("Error fetching favorite stations:", error);
      } finally {
        setLoadingStations(false);
      }
    };

    fetchStations();
  }, []);

  const handleBack = () => {
    navigateBackWithAnimation();
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;

    let processedValue: string | number = value;
    if (
      name === "price" ||
      name === "amount" ||
      name === "kilometers_since_last_refuel" ||
      name === "estimated_fuel_consumption"
    ) {
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

    if (!formData.price || formData.price < 0.001) {
      newErrors.price = t.refuels.priceMinRequired;
    } else if (formData.price > 10) {
      newErrors.price = t.refuels.priceMaxExceeded;
    }

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = t.refuels.amountMinRequired;
    } else if (formData.amount > 100) {
      newErrors.amount = t.refuels.amountMaxExceeded;
    }

    if (
      !formData.kilometers_since_last_refuel ||
      formData.kilometers_since_last_refuel <= 0
    ) {
      newErrors.kilometers_since_last_refuel = t.refuels.kilometersRequired;
    }

    if (
      !formData.estimated_fuel_consumption ||
      formData.estimated_fuel_consumption <= 0
    ) {
      newErrors.estimated_fuel_consumption = t.refuels.fuelConsumptionRequired;
    } else if (formData.estimated_fuel_consumption > 20) {
      newErrors.estimated_fuel_consumption =
        t.refuels.fuelConsumptionMaxExceeded;
    }

    if (formData.timestamp) {
      const selectedDate = new Date(formData.timestamp);
      const now = new Date();
      if (isNaN(selectedDate.getTime())) {
        newErrors.timestamp = t.refuels.invalidDateFormat;
      } else if (selectedDate > now) {
        newErrors.timestamp = t.refuels.dateCannotBeFuture;
      }
    } else {
      newErrors.timestamp = t.refuels.dateTimeRequired;
    }

    if (formData.notes && formData.notes.length > 500) {
      newErrors.notes = t.refuels.notesMaxLength;
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
      const submissionData = {
        ...formData,
        timestamp: formData.timestamp
          ? new Date(formData.timestamp).toISOString()
          : new Date().toISOString(),
        notes: formData.notes?.trim() || undefined,
        station_id: formData.station_id || undefined,
      };
      await createRefuel.mutateAsync(submissionData);

      // Navigate back with animation
      navigateWithAnimation(`/refuels/car/${carId}`);
    } catch (error: any) {
      console.error("Error creating refuel:", error);
      showError(error.response?.data?.detail || t.refuels.errorAddingRefuel);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCost = formData.price * formData.amount;

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
            <h1 className="heading-1">{t.refuels.addEntry}</h1>
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
        <div className="panel">
          <div className="flex flex-col items-center gap-2">
            <CircularProgress size={20} />
            <span className="text-secondary">{t.common.loading}</span>
          </div>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="panel">
            <div className="form-container">
              {/* Price and Amount - 2 columns on desktop */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Price per Liter */}
                <div className="form-group">
                  <label htmlFor="price" className="label">
                    {t.refuels.pricePerLiter} (€/L) *
                  </label>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    value={formData.price || ""}
                    onChange={handleChange}
                    className={`input ${errors.price ? "border-red-500" : ""}`}
                    step="0.001"
                    min="0.001"
                    max="10"
                    required
                  />
                  {errors.price && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {errors.price}
                    </p>
                  )}
                </div>

                {/* Amount */}
                <div className="form-group">
                  <label htmlFor="amount" className="label">
                    {t.refuels.amount} (L) *
                  </label>
                  <input
                    type="number"
                    id="amount"
                    name="amount"
                    value={formData.amount || ""}
                    onChange={handleChange}
                    className={`input ${errors.amount ? "border-red-500" : ""}`}
                    step="0.01"
                    min="0.01"
                    max="100"
                    required
                  />
                  {errors.amount && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {errors.amount}
                    </p>
                  )}
                </div>
              </div>

              {/* Total Cost (calculated) */}
              {totalCost > 0 && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t.refuels.totalCost}:
                    </span>
                    <span className="text-lg font-bold text-primary-600 dark:text-blue-400">
                      {totalCost.toFixed(2)} €
                    </span>
                  </div>
                </div>
              )}

              {/* Kilometers and Fuel Consumption - 2 columns on desktop */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Kilometers Since Last Refuel */}
                <div className="form-group">
                  <label
                    htmlFor="kilometers_since_last_refuel"
                    className="label"
                  >
                    {t.refuels.kilometersSinceLastRefuel} (km) *
                  </label>
                  <input
                    type="number"
                    id="kilometers_since_last_refuel"
                    name="kilometers_since_last_refuel"
                    value={formData.kilometers_since_last_refuel || ""}
                    onChange={handleChange}
                    className={`input ${
                      errors.kilometers_since_last_refuel
                        ? "border-red-500"
                        : ""
                    }`}
                    step="0.1"
                    min="0.1"
                    required
                  />
                  {errors.kilometers_since_last_refuel && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {errors.kilometers_since_last_refuel}
                    </p>
                  )}
                </div>

                {/* Estimated Fuel Consumption */}
                <div className="form-group">
                  <label htmlFor="estimated_fuel_consumption" className="label">
                    {t.refuels.estimatedFuelConsumption} (L/100km) *
                  </label>
                  <input
                    type="number"
                    id="estimated_fuel_consumption"
                    name="estimated_fuel_consumption"
                    value={formData.estimated_fuel_consumption || ""}
                    onChange={handleChange}
                    className={`input ${
                      errors.estimated_fuel_consumption ? "border-red-500" : ""
                    }`}
                    step="0.1"
                    min="0.1"
                    max="20"
                    required
                  />
                  {errors.estimated_fuel_consumption && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {errors.estimated_fuel_consumption}
                    </p>
                  )}
                </div>
              </div>

              {/* Timestamp and Station - 2 columns on desktop */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Timestamp */}
                <div className="form-group">
                  <label htmlFor="timestamp" className="label">
                    {t.refuels.dateTime} *
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

                {/* Favorite Station (optional) */}
                <div className="form-group">
                  <label htmlFor="station_id" className="label">
                    {t.refuels.station} ({t.refuels.optional})
                  </label>
                  <select
                    id="station_id"
                    name="station_id"
                    value={formData.station_id || ""}
                    onChange={handleChange}
                    className="input"
                  >
                    <option value="">{t.refuels.selectStation}</option>
                    {favoriteStations.map((station) => (
                      <option
                        key={station.station_id}
                        value={station.station_id}
                      >
                        {station.brand} - {station.street}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {t.refuels.favoriteStationsCanBeSelected}{" "}
                    <button
                      type="button"
                      onClick={() => router.push("/fuel-prices")}
                      className="text-primary-600 dark:text-blue-400 hover:underline"
                    >
                      {t.refuels.here}
                    </button>
                  </p>
                </div>
              </div>

              {/* Notes */}
              <div className="form-group">
                <label htmlFor="notes" className="label">
                  {t.refuels.notes} ({t.refuels.optional})
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  className={`input ${errors.notes ? "border-red-500" : ""}`}
                  rows={3}
                  maxLength={500}
                />
                {errors.notes && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.notes}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <div className="form-actions">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary w-full"
                >
                  {isSubmitting ? t.common.saving : t.refuels.addEntry}
                </button>
              </div>
            </div>
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
    </PageTransition>
  );
}
