import {
  useState,
  useEffect,
  useRef,
  startTransition,
  useMemo,
  useCallback,
} from "react";
import { useRouter } from "next/router";
import Panel from "@/components/common/Panel";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import {
  RefuelMetric,
  RefuelMetricCreate,
  RefuelMetricUpdate,
  FavoriteStationDropdown,
  apiService,
  FuelType,
} from "@/lib/api";
import { getLocalDateTimeString } from "@/lib/dateUtils";
import { Car } from "@/lib/api";

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

// Convert ISO timestamp to local datetime string for input
function isoToLocalDateTimeString(isoString: string): string {
  const date = new Date(isoString);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

// Format station display name
function formatStationName(
  refuel: RefuelMetric | undefined,
): string | undefined {
  if (!refuel) return undefined;
  if (refuel.station_brand && refuel.station_street) {
    return `${refuel.station_brand} - ${refuel.station_street}`;
  }
  if (refuel.station_brand) {
    return refuel.station_brand;
  }
  return undefined;
}

// Format fuel type label
function getFuelTypeLabel(fuelType: string | undefined): string {
  switch (fuelType) {
    case "e5":
      return "Super E5";
    case "e10":
      return "Super E10";
    case "diesel":
      return "Diesel";
    default:
      return fuelType || "";
  }
}

interface FormData {
  price: number;
  amount: number;
  kilometers_since_last_refuel: number;
  estimated_fuel_consumption: number;
  timestamp: string;
  notes: string;
  station_id?: string;
  fuel_type?: string;
}

interface RefuelFormBaseProps {
  carId: string;
  car: Car | null;
  isSubmitting: boolean;
  onCancel: () => void;
}

interface RefuelFormAddProps extends RefuelFormBaseProps {
  mode: "add";
  initialData?: undefined;
  onSubmit: (data: RefuelMetricCreate) => Promise<void>;
}

interface RefuelFormEditProps extends RefuelFormBaseProps {
  mode: "edit";
  initialData: RefuelMetric;
  onSubmit: (data: RefuelMetricUpdate) => Promise<void>;
}

type RefuelFormProps = RefuelFormAddProps | RefuelFormEditProps;

export default function RefuelForm({
  mode,
  carId,
  car,
  initialData,
  isSubmitting,
  onSubmit,
  onCancel,
}: RefuelFormProps) {
  const { t } = useTranslation();
  const router = useRouter();

  const isEditMode = mode === "edit";

  // Derive default fuel type from car
  const defaultFuelType = useMemo(() => {
    return mapCarFuelTypeToFuelType(car?.fuel_type) || "e5";
  }, [car?.fuel_type]);

  // Determine available fuel types based on car configuration
  const availableFuelTypes = useMemo(() => {
    const carFuelType = mapCarFuelTypeToFuelType(car?.fuel_type);
    if (carFuelType === "diesel") {
      return [{ value: "diesel", label: "Diesel" }];
    }
    return [
      { value: "e5", label: "Super E5" },
      { value: "e10", label: "Super E10" },
    ];
  }, [car?.fuel_type]);

  // Initialize form data
  const getInitialFormData = useCallback((): FormData => {
    if (initialData) {
      return {
        price: initialData.price,
        amount: initialData.amount,
        kilometers_since_last_refuel: initialData.kilometers_since_last_refuel,
        estimated_fuel_consumption: initialData.estimated_fuel_consumption,
        timestamp: isoToLocalDateTimeString(initialData.timestamp),
        notes: initialData.notes || "",
        station_id: initialData.station_id,
        fuel_type: initialData.fuel_type,
      };
    }
    return {
      price: 0,
      amount: 0,
      kilometers_since_last_refuel: 0,
      estimated_fuel_consumption: 0,
      timestamp: getLocalDateTimeString(),
      notes: "",
      station_id: undefined,
      fuel_type: undefined,
    };
  }, [initialData]);

  const [formData, setFormData] = useState<FormData>(getInitialFormData);
  const [originalData] = useState<FormData>(getInitialFormData);

  const [favoriteStations, setFavoriteStations] = useState<
    FavoriteStationDropdown[]
  >([]);
  const [loadingStations, setLoadingStations] = useState(!isEditMode);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const stationDefaultApplied = useRef(false);
  const fuelTypeDefaultApplied = useRef(false);
  const priceAutoFilled = useRef(isEditMode); // Don't auto-fill in edit mode

  // Check if form has changes (for edit mode)
  const hasChanges = useMemo(() => {
    if (!isEditMode) return true;
    return (
      formData.price !== originalData.price ||
      formData.amount !== originalData.amount ||
      formData.kilometers_since_last_refuel !==
        originalData.kilometers_since_last_refuel ||
      formData.estimated_fuel_consumption !==
        originalData.estimated_fuel_consumption ||
      formData.notes !== originalData.notes ||
      formData.fuel_type !== originalData.fuel_type
    );
  }, [formData, originalData, isEditMode]);

  // Set default fuel type when car loads (add mode only)
  useEffect(() => {
    if (!isEditMode && car && !fuelTypeDefaultApplied.current) {
      fuelTypeDefaultApplied.current = true;
      setFormData((prev) => ({
        ...prev,
        fuel_type: defaultFuelType,
      }));
    }
  }, [car, defaultFuelType, isEditMode]);

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

  // Auto-fill price when station or fuel type changes (add mode only)
  useEffect(() => {
    if (isEditMode) return;

    const price = getPriceForFuelType(selectedStation, formData.fuel_type);

    if (price !== null && !priceAutoFilled.current) {
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
    isEditMode,
  ]);

  // Fetch favorite stations (add mode only)
  useEffect(() => {
    if (isEditMode) return;

    const fetchStations = async (position?: { lat: number; lng: number }) => {
      try {
        startTransition(() => setLoadingStations(true));
        const response =
          await apiService.getFavoriteStationsForDropdown(position);
        const { favorites, closest } = response;

        let merged = [...favorites];
        if (
          closest &&
          !favorites.some((s) => s.station_id === closest.station_id)
        ) {
          merged = [closest, ...merged];
        }

        startTransition(() => setFavoriteStations(merged));

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

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          fetchStations({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {
          fetchStations();
        },
      );
    } else {
      fetchStations();
    }
  }, [isEditMode]);

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
      if (name === "price") {
        priceAutoFilled.current = true;
      }
    }

    setFormData((prev) => ({
      ...prev,
      [name]: processedValue,
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleStationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStationId = e.target.value || undefined;

    priceAutoFilled.current = false;

    setFormData((prev) => ({
      ...prev,
      station_id: newStationId,
      price: 0,
    }));

    if (errors.station_id) {
      setErrors((prev) => ({ ...prev, station_id: "" }));
    }
  };

  const handleFuelTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFuelType = e.target.value as FuelType;

    const newPrice = getPriceForFuelType(selectedStation, newFuelType);

    setFormData((prev) => ({
      ...prev,
      fuel_type: newFuelType,
      price: !isEditMode && newPrice !== null ? newPrice : prev.price,
    }));

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

    // Only validate timestamp in add mode
    if (!isEditMode) {
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

    if (isEditMode && initialData) {
      // Build update data - only include changed fields
      const updateData: RefuelMetricUpdate = {
        timestamp: initialData.timestamp, // Original timestamp for lookup
        car_id: carId,
      };

      if (formData.price !== originalData.price) {
        updateData.price = formData.price;
      }
      if (formData.amount !== originalData.amount) {
        updateData.amount = formData.amount;
      }
      if (
        formData.kilometers_since_last_refuel !==
        originalData.kilometers_since_last_refuel
      ) {
        updateData.kilometers_since_last_refuel =
          formData.kilometers_since_last_refuel;
      }
      if (
        formData.estimated_fuel_consumption !==
        originalData.estimated_fuel_consumption
      ) {
        updateData.estimated_fuel_consumption =
          formData.estimated_fuel_consumption;
      }
      if (formData.notes !== originalData.notes) {
        updateData.notes = formData.notes?.trim() || undefined;
      }
      if (formData.fuel_type !== originalData.fuel_type) {
        updateData.fuel_type = formData.fuel_type as FuelType;
      }

      await onSubmit(updateData);
    } else {
      // Create data
      const createData: RefuelMetricCreate = {
        car_id: carId,
        price: formData.price,
        amount: formData.amount,
        kilometers_since_last_refuel: formData.kilometers_since_last_refuel,
        estimated_fuel_consumption: formData.estimated_fuel_consumption,
        timestamp: formData.timestamp
          ? new Date(formData.timestamp).toISOString()
          : new Date().toISOString(),
        notes: formData.notes?.trim() || undefined,
        station_id: formData.station_id || undefined,
        fuel_type: formData.fuel_type || undefined,
      };

      await onSubmit(createData);
    }
  };

  const totalCost = formData.price * formData.amount;
  const actualConsumption =
    formData.amount > 0 && formData.kilometers_since_last_refuel > 0
      ? (formData.amount / formData.kilometers_since_last_refuel) * 100
      : null;

  // Format station name for edit mode display
  const stationDisplayName = isEditMode
    ? formatStationName(initialData)
    : undefined;

  return (
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
                  {t.forms.dateTime} {!isEditMode && "*"}
                </label>
                {isEditMode ? (
                  <div className="input bg-gray-100 dark:bg-gray-700 cursor-not-allowed">
                    {new Date(initialData?.timestamp || "").toLocaleString()}
                  </div>
                ) : (
                  <>
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
                  </>
                )}
              </div>

              {/* Station */}
              <div className="form-group">
                <label htmlFor="station_id" className="label">
                  {t.refuels.station} ({t.refuels.optional})
                </label>
                {isEditMode ? (
                  <div className="input bg-gray-100 dark:bg-gray-700 cursor-not-allowed">
                    {stationDisplayName || t.refuels.selectStation}
                  </div>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            </div>

            {/* Section: Refuel Data */}
            <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mt-4">
              {t.refuels.refuelData}
            </h3>

            {/* Row 2: Fuel Type, Price per Liter, and Amount */}
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
                <label htmlFor="kilometers_since_last_refuel" className="label">
                  {t.refuels.kilometersSinceLastRefuel} *
                </label>
                <input
                  type="number"
                  id="kilometers_since_last_refuel"
                  name="kilometers_since_last_refuel"
                  value={formData.kilometers_since_last_refuel || ""}
                  onChange={handleChange}
                  className={`input ${
                    errors.kilometers_since_last_refuel ? "border-red-500" : ""
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

            {/* Overview: Total Cost and Actual Consumption (add mode only) */}
            {!isEditMode && (
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
            )}

            {/* Submit Button */}
            <div className="form-actions">
              {isEditMode ? (
                <button
                  type="submit"
                  disabled={isSubmitting || !hasChanges}
                  className={`btn-primary w-full ${
                    !hasChanges ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {isSubmitting
                    ? t.common.saving
                    : hasChanges
                    ? t.common.save
                    : t.refuels.noChanges || "No changes"}
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary w-full"
                >
                  {isSubmitting ? t.common.saving : t.navigation.addEntry}
                </button>
              )}
            </div>
          </div>
        </Panel>
      </form>
    </div>
  );
}
