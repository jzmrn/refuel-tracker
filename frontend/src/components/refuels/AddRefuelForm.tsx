import React, { useState, useEffect } from "react";
import {
  RefuelMetricCreate,
  FavoriteStationDropdown,
  Car,
  apiService,
} from "../../lib/api";
import { StandardForm } from "../common/StandardForm";
import { useTranslation } from "../../lib/i18n/LanguageContext";
import { getLocalDateTimeString } from "../../lib/dateUtils";

interface AddRefuelFormProps {
  onSubmit: (refuel: RefuelMetricCreate) => void;
  onCancel?: () => void;
  preselectedCar?: string;
}

export default function AddRefuelForm({
  onSubmit,
  onCancel,
  preselectedCar,
}: AddRefuelFormProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<RefuelMetricCreate>({
    car_id: preselectedCar || "",
    price: 0,
    amount: 0,
    kilometers_since_last_refuel: 0,
    estimated_fuel_consumption: 0,
    timestamp: getLocalDateTimeString(), // Current date/time in YYYY-MM-DDTHH:mm format
    notes: "",
    station_id: undefined,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cars, setCars] = useState<Car[]>([]);
  const [favoriteStations, setFavoriteStations] = useState<
    FavoriteStationDropdown[]
  >([]);
  const [loadingStations, setLoadingStations] = useState(false);
  const [loadingCars, setLoadingCars] = useState(false);

  // Fetch cars and favorite stations on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingCars(true);
        const carsData = await apiService.getCars();
        setCars(carsData);

        // If preselectedCar is provided and valid, use it
        if (preselectedCar && carsData.some((c) => c.id === preselectedCar)) {
          setFormData((prev) => ({ ...prev, car_id: preselectedCar }));
        } else if (carsData.length > 0 && !preselectedCar) {
          // Auto-select first car if none selected
          setFormData((prev) => ({ ...prev, car_id: carsData[0].id }));
        }
      } catch (error) {
        console.error("Error fetching cars:", error);
      } finally {
        setLoadingCars(false);
      }

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

    fetchData();
  }, [preselectedCar]);

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

    // Real-time validation - clear error if value is now valid
    if (errors[name]) {
      let isValid = false;

      if (name === "price") {
        const numValue = parseFloat(value);
        isValid = numValue >= 0.001 && numValue <= 10;
      } else if (name === "amount") {
        const numValue = parseFloat(value);
        isValid = numValue > 0 && numValue <= 100;
      } else if (name === "kilometers_since_last_refuel") {
        const numValue = parseFloat(value);
        isValid = numValue > 0;
      } else if (name === "estimated_fuel_consumption") {
        const numValue = parseFloat(value);
        isValid = numValue > 0 && numValue <= 20;
      } else if (name === "timestamp") {
        const selectedDate = new Date(value);
        const now = new Date();
        isValid = !isNaN(selectedDate.getTime()) && selectedDate <= now;
      } else if (name === "notes") {
        isValid = value.length <= 500;
      } else {
        isValid = true; // For other text fields
      }

      if (isValid) {
        setErrors((prev) => ({
          ...prev,
          [name]: "",
        }));
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Car validation
    if (!formData.car_id) {
      newErrors.car_id = "Please select a car";
    }

    // Price validation
    if (!formData.price || formData.price < 0.001) {
      newErrors.price = t.refuels.priceMinRequired;
    } else if (formData.price > 10) {
      newErrors.price = t.refuels.priceMaxExceeded;
    }

    // Amount validation
    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = t.refuels.amountMinRequired;
    } else if (formData.amount > 100) {
      newErrors.amount = t.refuels.amountMaxExceeded;
    }

    // Kilometers validation
    if (
      !formData.kilometers_since_last_refuel ||
      formData.kilometers_since_last_refuel <= 0
    ) {
      newErrors.kilometers_since_last_refuel = t.refuels.kilometersRequired;
    }

    // Estimated fuel consumption validation
    if (
      !formData.estimated_fuel_consumption ||
      formData.estimated_fuel_consumption <= 0
    ) {
      newErrors.estimated_fuel_consumption = t.refuels.fuelConsumptionRequired;
    } else if (formData.estimated_fuel_consumption > 20) {
      newErrors.estimated_fuel_consumption =
        t.refuels.fuelConsumptionMaxExceeded;
    }

    // Timestamp validation
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

    // Notes validation (optional but with length limit)
    if (formData.notes && formData.notes.length > 500) {
      newErrors.notes = t.refuels.notesMaxLength;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      // Convert datetime-local string to ISO string for backend
      const submissionData = {
        ...formData,
        timestamp: formData.timestamp
          ? new Date(formData.timestamp).toISOString()
          : new Date().toISOString(),
        notes: formData.notes?.trim() || undefined,
        station_id: formData.station_id || undefined,
      };
      onSubmit(submissionData);

      // Reset form (keep car selection)
      setFormData((prev) => ({
        car_id: prev.car_id, // Keep the selected car
        price: 0,
        amount: 0,
        kilometers_since_last_refuel: 0,
        estimated_fuel_consumption: 0,
        timestamp: getLocalDateTimeString(), // Reset to current date/time
        notes: "",
        station_id: undefined,
      }));
    }
  };

  const totalCost = formData.price * formData.amount;

  const formActions = (
    <>
      <button type="submit" className="btn-primary flex-1">
        {t.navigation.addEntry}
      </button>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary flex-1"
        >
          {t.common.cancel}
        </button>
      )}
    </>
  );

  return (
    <StandardForm
      title={t.navigation.addEntry}
      onSubmit={handleSubmit}
      actions={formActions}
      containerClass="panel"
    >
      <div className="form-group">
        <label htmlFor="timestamp" className="label">
          {t.forms.dateTime} *
        </label>
        <div className="flex gap-2 min-w-0">
          <input
            type="datetime-local"
            id="timestamp"
            name="timestamp"
            value={formData.timestamp || ""}
            onChange={handleChange}
            className={`input flex-1 min-w-0 ${
              errors.timestamp ? "border-red-300" : ""
            }`}
            required
          />
          <button
            type="button"
            onClick={() => {
              setFormData((prev) => ({
                ...prev,
                timestamp: getLocalDateTimeString(),
              }));
              // Clear error when setting to now
              if (errors.timestamp) {
                setErrors((prev) => ({ ...prev, timestamp: "" }));
              }
            }}
            className="btn-sm-secondary whitespace-nowrap flex-shrink-0"
          >
            {t.forms.now}
          </button>
        </div>
        {errors.timestamp && <p className="error-text">{errors.timestamp}</p>}
      </div>

      <div className="form-row">
        {/* Car Selection */}
        <div className="form-group">
          <label htmlFor="car_id" className="label">
            Car *
          </label>
          <select
            id="car_id"
            name="car_id"
            value={formData.car_id}
            onChange={handleChange}
            className={`input ${errors.car_id ? "border-red-300" : ""}`}
            disabled={loadingCars}
            required
          >
            <option value="">-- Select a car --</option>
            {cars.map((car) => (
              <option key={car.id} value={car.id}>
                {car.name} ({car.year})
                {!car.is_owner && ` - Shared by ${car.shared_by}`}
              </option>
            ))}
          </select>
          {errors.car_id && <p className="error-text">{errors.car_id}</p>}
          {cars.length === 0 && !loadingCars && (
            <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
              No cars available. Please add a car in the Cars page first.
            </p>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="station_id" className="label">
            {t.refuels.gasStation} ({t.refuels.optional})
          </label>
          <select
            id="station_id"
            name="station_id"
            value={formData.station_id || ""}
            onChange={handleChange}
            className="input"
            disabled={loadingStations}
          >
            <option value="">{t.refuels.selectStation}</option>
            {favoriteStations.map((station) => (
              <option key={station.station_id} value={station.station_id}>
                {station.brand} - {station.street} {station.house_number},{" "}
                {station.place}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="price" className="label">
            {t.refuels.pricePerLiterForm} *{" "}
            <span className="text-xs text-secondary">(0.01 - 10)</span>
          </label>
          <input
            type="number"
            step="0.001"
            min="0.01"
            max="10"
            id="price"
            name="price"
            value={formData.price || ""}
            onChange={handleChange}
            className={`input ${errors.price ? "border-red-300" : ""}`}
            placeholder="1.589"
            required
          />
          {errors.price && <p className="error-text">{errors.price}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="amount" className="label">
            {t.refuels.amountLiters} *{" "}
            <span className="text-xs text-secondary">(0.01 - 100)</span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            max="100"
            id="amount"
            name="amount"
            value={formData.amount || ""}
            onChange={handleChange}
            className={`input ${errors.amount ? "border-red-300" : ""}`}
            placeholder="45.20"
            required
          />
          {errors.amount && <p className="error-text">{errors.amount}</p>}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="kilometers_since_last_refuel" className="label">
            {t.refuels.kilometersSinceLastRefuel} *
          </label>
          <input
            type="number"
            step="1"
            min="1"
            id="kilometers_since_last_refuel"
            name="kilometers_since_last_refuel"
            value={formData.kilometers_since_last_refuel || ""}
            onChange={handleChange}
            className={`input ${
              errors.kilometers_since_last_refuel ? "border-red-300" : ""
            }`}
            placeholder="450"
            required
          />
          {errors.kilometers_since_last_refuel && (
            <p className="error-text">{errors.kilometers_since_last_refuel}</p>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="estimated_fuel_consumption" className="label">
            {t.refuels.estimatedFuelConsumption} *{" "}
            <span className="text-xs text-secondary">(0.1 - 20.0)</span>
          </label>
          <input
            type="number"
            step="0.1"
            min="0.1"
            max="20"
            id="estimated_fuel_consumption"
            name="estimated_fuel_consumption"
            value={formData.estimated_fuel_consumption || ""}
            onChange={handleChange}
            className={`input ${
              errors.estimated_fuel_consumption ? "border-red-300" : ""
            }`}
            placeholder="7.5"
            required
          />
          {errors.estimated_fuel_consumption && (
            <p className="error-text">{errors.estimated_fuel_consumption}</p>
          )}
        </div>
      </div>

      {formData.price > 0 && formData.amount > 0 && (
        <div className="calculation-box">
          <p className="calculation-text">
            <span className="calculation-highlight">
              {t.refuels.totalCostCalc}: {totalCost.toFixed(2)} €
            </span>
          </p>
          {formData.kilometers_since_last_refuel > 0 && formData.amount > 0 && (
            <p className="calculation-text mt-1">
              {t.refuels.actualConsumption}:{" "}
              <span className="calculation-highlight">
                {(
                  (formData.amount / formData.kilometers_since_last_refuel) *
                  100
                ).toFixed(1)}{" "}
                L/100km
              </span>
              {formData.estimated_fuel_consumption > 0 && (
                <span
                  className={`ml-2 ${
                    (formData.amount / formData.kilometers_since_last_refuel) *
                      100 >
                    formData.estimated_fuel_consumption
                      ? "text-red-600 dark:text-red-400"
                      : "text-green-600 dark:text-green-400"
                  }`}
                >
                  (
                  {(formData.amount / formData.kilometers_since_last_refuel) *
                    100 >
                  formData.estimated_fuel_consumption
                    ? "+"
                    : ""}
                  {(
                    (formData.amount / formData.kilometers_since_last_refuel) *
                      100 -
                    formData.estimated_fuel_consumption
                  ).toFixed(1)}{" "}
                  {t.refuels.vsEstimated})
                </span>
              )}
            </p>
          )}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="notes" className="label">
          {t.dataTracking.notes} ({t.refuels.optional})
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          value={formData.notes || ""}
          onChange={handleChange}
          className={`input ${errors.notes ? "border-red-300" : ""}`}
          placeholder={t.refuels.placeholders.notes}
          maxLength={500}
        />
        {errors.notes && <p className="error-text">{errors.notes}</p>}
        {formData.notes && (
          <p className="mt-1 text-xs text-secondary">
            {formData.notes.length}/500 {t.refuels.charactersCount}
          </p>
        )}
      </div>
    </StandardForm>
  );
}
