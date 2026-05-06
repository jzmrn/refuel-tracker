import {
  Suspense,
  useState,
  useEffect,
  useRef,
  startTransition,
  useMemo,
  useCallback,
} from "react";
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
  FuelType,
} from "@/lib/api";
import { getLocalDateTimeString } from "@/lib/dateUtils";
import { DynamicPage, PageHeader } from "@/components/common";

// Map car fuel_type (free text) to FuelType (e5/e10/diesel)
function mapCarFuelTypeToFuelType(carFuelType?: string): FuelType | undefined {
  if (!carFuelType) return undefined;
  const normalized = carFuelType.toLowerCase();

  // E10 mappings
  if (normalized.includes("e10") || normalized === "super e10") {
    return "e10";
  }
  // E5 mappings (Super, Super Plus, Benzin, Petrol)
  if (
    normalized.includes("e5") ||
    normalized.includes("super") ||
    normalized.includes("benzin") ||
    normalized.includes("petrol") ||
    normalized.includes("gasoline")
  ) {
    return "e5";
  }
  // Diesel mappings
  if (normalized.includes("diesel")) {
    return "diesel";
  }

  return undefined;
}

function AddRefuelContent({ carId }: { carId: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: car } = useCar(carId);
  const createRefuel = useCreateRefuelMetric();
  const { snackbar, showError, hideSnackbar } = useSnackbar();

  // Derive default fuel type from car
  const defaultFuelType = useMemo(() => {
    return mapCarFuelTypeToFuelType(car?.fuel_type) || "e5";
  }, [car?.fuel_type]);

  // Determine available fuel types based on car configuration
  // Diesel cars can only use diesel; petrol cars (e5/e10) can use either e5 or e10
  const availableFuelTypes = useMemo(() => {
    const carFuelType = mapCarFuelTypeToFuelType(car?.fuel_type);
    if (carFuelType === "diesel") {
      return [{ value: "diesel", label: "Diesel" }];
    }
    // For petrol cars (e5, e10) or unknown, show both petrol options
    return [
      { value: "e5", label: "Super E5" },
      { value: "e10", label: "Super E10" },
    ];
  }, [car?.fuel_type]);

  const [formData, setFormData] = useState<RefuelMetricCreate>({
    car_id: carId,
    price: 0,
    amount: 0,
    kilometers_since_last_refuel: 0,
    estimated_fuel_consumption: 0,
    timestamp: getLocalDateTimeString(),
    notes: "",
    station_id: undefined,
    fuel_type: undefined, // Will be set when car loads
  });

  const [favoriteStations, setFavoriteStations] = useState<
    FavoriteStationDropdown[]
  >([]);
  const [loadingStations, setLoadingStations] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const stationDefaultApplied = useRef(false);
  const fuelTypeDefaultApplied = useRef(false);
  const priceAutoFilled = useRef(false);

  // Set default fuel type when car loads
  useEffect(() => {
    if (car && !fuelTypeDefaultApplied.current) {
      fuelTypeDefaultApplied.current = true;
      setFormData((prev) => ({
        ...prev,
        fuel_type: defaultFuelType,
      }));
    }
  }, [car, defaultFuelType]);

  // Get selected station for price lookup
  const selectedStation = useMemo(() => {
    return favoriteStations.find((s) => s.station_id === formData.station_id);
  }, [favoriteStations, formData.station_id]);

  // Get price for selected fuel type from station
  const getPriceForFuelType = useCallback(
    (
      station: FavoriteStationDropdown | undefined,
      fuelType: string | undefined,
    ): number | null => {
      if (!station?.prices || !fuelType) return null;

      const priceData = station.prices[fuelType as keyof typeof station.prices];
      return priceData?.value ?? null;
    },
    [],
  );

  // Auto-fill price when station or fuel type changes
  useEffect(() => {
    const price = getPriceForFuelType(selectedStation, formData.fuel_type);

    if (price !== null && !priceAutoFilled.current) {
      // Only auto-fill if price field is empty/zero
      if (formData.price === 0) {
        setFormData((prev) => ({
          ...prev,
          price: price,
        }));
        priceAutoFilled.current = true;
      }
    }
  }, [
    selectedStation,
    formData.fuel_type,
    formData.price,
    getPriceForFuelType,
  ]);

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
      // If user manually changes price, mark as manually edited
      if (name === "price") {
        priceAutoFilled.current = true;
      }
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

  // Handle station change with price auto-fill
  const handleStationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStationId = e.target.value || undefined;

    // Reset price auto-fill flag when station changes
    priceAutoFilled.current = false;

    setFormData((prev) => ({
      ...prev,
      station_id: newStationId,
      // Clear price to allow auto-fill for new station
      price: 0,
    }));

    // Clear station error
    if (errors.station_id) {
      setErrors((prev) => ({ ...prev, station_id: "" }));
    }
  };

  // Handle fuel type change with price auto-fill
  const handleFuelTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFuelType = e.target.value as FuelType;

    // Get new price for the selected fuel type
    const newPrice = getPriceForFuelType(selectedStation, newFuelType);

    setFormData((prev) => ({
      ...prev,
      fuel_type: newFuelType,
      // Update price if available, otherwise keep current (user can still edit)
      price: newPrice !== null ? newPrice : prev.price,
    }));

    // Clear fuel_type error
    if (errors.fuel_type) {
      setErrors((prev) => ({ ...prev, fuel_type: "" }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.fuel_type) {
      newErrors.fuel_type = t.cars.selectFuelType;
    }

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
        fuel_type: formData.fuel_type || undefined,
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
              {/* Section: Metadata */}
              <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300">
                {t.refuels.metadata}
              </h3>

              {/* Row 1: Date and Station (metadata) */}
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

                {/* Station */}
                <div className="form-group">
                  <label htmlFor="station_id" className="label">
                    {t.refuels.station} ({t.refuels.optional})
                  </label>
                  <select
                    id="station_id"
                    name="station_id"
                    value={formData.station_id || ""}
                    onChange={handleStationChange}
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
                        {station.prices ? " €" : ""}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {t.refuels.favoriteStationsCanBeSelected}{" "}
                    <button
                      type="button"
                      onClick={() => router.push("/prices/stations")}
                      className="text-primary-600 dark:text-blue-400 hover:underline"
                    >
                      {t.refuels.here}
                    </button>
                  </p>
                </div>
              </div>

              {/* Section: Refuel Data */}
              <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mt-4">
                {t.refuels.refuelData}
              </h3>

              {/* Row 2: Fuel Type, Price per Liter, and Amount - 3 columns on desktop */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Fuel Type */}
                <div className="form-group">
                  <label htmlFor="fuel_type" className="label">
                    {t.cars.fuelType} *
                  </label>
                  <select
                    id="fuel_type"
                    name="fuel_type"
                    value={formData.fuel_type || ""}
                    onChange={handleFuelTypeChange}
                    className={`input ${
                      errors.fuel_type ? "border-red-500" : ""
                    }`}
                    required
                  >
                    <option value="">{t.cars.selectFuelType}</option>
                    {availableFuelTypes.map((ft) => (
                      <option key={ft.value} value={ft.value}>
                        {ft.label}
                      </option>
                    ))}
                  </select>
                  {errors.fuel_type && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {errors.fuel_type}
                    </p>
                  )}
                </div>

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

              {/* Section: Car Data */}
              <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mt-4">
                {t.refuels.carData}
              </h3>

              {/* Row 3: Kilometers and Estimated Fuel Consumption */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Kilometers Since Last Refuel */}
                <div className="form-group">
                  <label
                    htmlFor="kilometers_since_last_refuel"
                    className="label"
                  >
                    {t.refuels.kilometersSinceLastRefuel} *
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

              {/* Overview: Total Cost and Actual Consumption (calculated) */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  {t.refuels.overview}
                </h3>
                <div className="grid grid-cols-[1fr_auto_auto] gap-x-2 gap-y-2 items-center">
                  {/* Total Cost Row */}
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate min-w-0">
                    {t.refuels.totalCost}
                  </span>
                  <span className="text-lg font-bold text-primary-600 dark:text-blue-400 text-right tabular-nums">
                    {totalCost > 0 ? totalCost.toFixed(2) : "—"}
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-400 text-left">
                    {totalCost > 0 ? "€" : ""}
                  </span>

                  {/* Actual Consumption Row */}
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate min-w-0">
                    {t.refuels.actualConsumption}
                  </span>
                  <span className="text-lg font-bold text-primary-600 dark:text-blue-400 text-right tabular-nums">
                    {actualConsumption !== null
                      ? actualConsumption.toFixed(2)
                      : "—"}
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-400 text-left">
                    {actualConsumption !== null ? "L/100km" : ""}
                  </span>
                </div>
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
