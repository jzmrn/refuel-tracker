import { Suspense, useState, useEffect, useRef, startTransition } from "react";
import { useRouter } from "next/router";
import Panel from "@/components/common/Panel";
import Snackbar from "@/components/common/Snackbar";
import { useSnackbar } from "@/lib/useSnackbar";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useCreateRefuelMetric, useCar } from "@/lib/hooks/useCars";
import {
  RefuelMetricCreate,
  FavoriteStationDropdown,
  apiService,
} from "@/lib/api";
import { getLocalDateTimeString } from "@/lib/dateUtils";
import { DynamicPage, PageHeader } from "@/components/common";

function AddRefuelContent({ carId }: { carId: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: car } = useCar(carId);
  const createRefuel = useCreateRefuelMetric();
  const { snackbar, showError, hideSnackbar } = useSnackbar();

  const [formData, setFormData] = useState<RefuelMetricCreate>({
    car_id: carId,
    price: 0,
    amount: 0,
    kilometers_since_last_refuel: 0,
    estimated_fuel_consumption: 0,
    timestamp: getLocalDateTimeString(),
    notes: "",
    station_id: undefined,
  });

  const [favoriteStations, setFavoriteStations] = useState<
    FavoriteStationDropdown[]
  >([]);
  const [loadingStations, setLoadingStations] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const stationDefaultApplied = useRef(false);

  // Fetch favorite stations, optionally with user position for closest station
  useEffect(() => {
    const fetchStations = async (position?: { lat: number; lng: number }) => {
      try {
        startTransition(() => setLoadingStations(true));
        const response =
          await apiService.getFavoriteStationsForDropdown(position);
        const { favorites, closest } = response;

        // Merge closest into the list, avoiding duplicates
        let merged = [...favorites];
        if (
          closest &&
          !favorites.some((s) => s.station_id === closest.station_id)
        ) {
          merged = [closest, ...merged];
        }

        startTransition(() => setFavoriteStations(merged));

        // Pre-select closest station as default (only if user hasn't picked one)
        if (closest && !stationDefaultApplied.current) {
          stationDefaultApplied.current = true;
          setFormData((prev) => {
            if (prev.station_id) return prev;
            return { ...prev, station_id: closest.station_id };
          });
        }
      } catch (error) {
        console.error("Error fetching favorite stations:", error);
      } finally {
        startTransition(() => setLoadingStations(false));
      }
    };

    // Try to get user position silently, then fetch stations
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          fetchStations({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {
          // Location denied or unavailable — fetch without position
          fetchStations();
        },
      );
    } else {
      fetchStations();
    }
  }, []);

  const handleBack = () => {
    router.back();
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

      // Navigate back
      router.push(`/cars/${carId}`);
    } catch (error: any) {
      console.error("Error creating refuel:", error);
      showError(error.response?.data?.detail || t.refuels.errorAddingRefuel);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCost = formData.price * formData.amount;
  const actualConsumption =
    formData.amount > 0 && formData.kilometers_since_last_refuel > 0
      ? (formData.amount / formData.kilometers_since_last_refuel) * 100
      : null;

  return (
    <>
      <PageHeader
        title={t.navigation.addEntry}
        subtitle={car ? `${car.name} (${car.year})` : undefined}
        onBack={handleBack}
      />

      {/* Form */}
      <div className="max-w-3xl mx-auto">
        <form onSubmit={handleSubmit}>
          <Panel>
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
                    {t.refuels.estimatedFuelConsumption} *
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

              {/* Total Cost and Actual Consumption (calculated) */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t.refuels.totalCost}:
                  </span>
                  <span className="text-lg font-bold text-primary-600 dark:text-blue-400">
                    {totalCost > 0 ? `${totalCost.toFixed(2)} €` : "—"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t.refuels.actualConsumption}:
                  </span>
                  <span className="text-lg font-bold text-primary-600 dark:text-blue-400">
                    {actualConsumption !== null
                      ? `${actualConsumption.toFixed(2)} L/100km`
                      : "—"}
                  </span>
                </div>
              </div>

              {/* Timestamp and Station - 2 columns on desktop */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    max={getLocalDateTimeString()}
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
                    disabled={loadingStations}
                  >
                    <option value="">
                      {loadingStations
                        ? t.common.loading
                        : t.refuels.selectStation}
                    </option>
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
                      onClick={() => router.push("/prices//stations")}
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
                  {t.common.notes} ({t.refuels.optional})
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
                  {isSubmitting ? t.common.saving : t.navigation.addEntry}
                </button>
              </div>
            </div>
          </Panel>
        </form>
      </div>

      {/* Snackbar */}
      {snackbar.isVisible && (
        <Snackbar
          message={snackbar.message}
          type={snackbar.type}
          onClose={hideSnackbar}
          isVisible={true}
        />
      )}
    </>
  );
}

export default function AddRefuel() {
  return (
    <DynamicPage>{(carId) => <AddRefuelContent carId={carId} />}</DynamicPage>
  );
}
