import React, { useState } from "react";
import { RefuelMetricCreate } from "../../lib/api";
import { StandardForm } from "../common/StandardForm";

interface AddRefuelFormProps {
  onSubmit: (refuel: RefuelMetricCreate) => void;
  onCancel?: () => void;
}

export default function AddRefuelForm({
  onSubmit,
  onCancel,
}: AddRefuelFormProps) {
  const [formData, setFormData] = useState<RefuelMetricCreate>({
    price: 0,
    amount: 0,
    kilometers_since_last_refuel: 0,
    estimated_fuel_consumption: 0,
    timestamp: new Date().toISOString().slice(0, 16), // Current date/time in YYYY-MM-DDTHH:mm format
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
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
        isValid = !isNaN(selectedDate.getTime()) && selectedDate <= new Date();
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

    // Price validation
    if (!formData.price || formData.price < 0.001) {
      newErrors.price = "Price must be at least 0.001 €/L";
    } else if (formData.price > 10) {
      newErrors.price = "Price cannot exceed 10 €/L";
    }

    // Amount validation
    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = "Amount must be greater than 0";
    } else if (formData.amount > 100) {
      newErrors.amount = "Amount cannot exceed 100 liters";
    }

    // Kilometers validation
    if (
      !formData.kilometers_since_last_refuel ||
      formData.kilometers_since_last_refuel <= 0
    ) {
      newErrors.kilometers_since_last_refuel =
        "Kilometers must be greater than 0";
    }

    // Estimated fuel consumption validation
    if (
      !formData.estimated_fuel_consumption ||
      formData.estimated_fuel_consumption <= 0
    ) {
      newErrors.estimated_fuel_consumption =
        "Estimated fuel consumption must be greater than 0";
    } else if (formData.estimated_fuel_consumption > 20) {
      newErrors.estimated_fuel_consumption =
        "Estimated fuel consumption cannot exceed 20 L/100km";
    }

    // Timestamp validation
    if (formData.timestamp) {
      const selectedDate = new Date(formData.timestamp);
      const now = new Date();
      if (isNaN(selectedDate.getTime())) {
        newErrors.timestamp = "Invalid date format";
      } else if (selectedDate > now) {
        newErrors.timestamp = "Date cannot be in the future";
      }
    } else {
      newErrors.timestamp = "Date and time is required";
    }

    // Notes validation (optional but with length limit)
    if (formData.notes && formData.notes.length > 500) {
      newErrors.notes = "Notes must be 500 characters or less";
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
      };
      onSubmit(submissionData);

      // Reset form
      setFormData({
        price: 0,
        amount: 0,
        kilometers_since_last_refuel: 0,
        estimated_fuel_consumption: 0,
        timestamp: new Date().toISOString().slice(0, 16), // Reset to current date/time
        notes: "",
      });
    }
  };

  const totalCost = formData.price * formData.amount;

  const formActions = (
    <>
      <button type="submit" className="btn-primary flex-1">
        Add Entry
      </button>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary flex-1"
        >
          Cancel
        </button>
      )}
    </>
  );

  return (
    <StandardForm
      onSubmit={handleSubmit}
      actions={formActions}
      containerClass="panel"
    >
      <div className="form-group">
        <label htmlFor="timestamp" className="label">
          Date & Time *
        </label>
        <div className="flex gap-2">
          <input
            type="datetime-local"
            id="timestamp"
            name="timestamp"
            value={formData.timestamp || ""}
            max={new Date().toISOString().slice(0, 16)}
            onChange={handleChange}
            className={`input flex-1 ${
              errors.timestamp ? "border-red-300" : ""
            }`}
            required
          />
          <button
            type="button"
            onClick={() => {
              setFormData((prev) => ({
                ...prev,
                timestamp: new Date().toISOString().slice(0, 16),
              }));
              // Clear error when setting to now
              if (errors.timestamp) {
                setErrors((prev) => ({ ...prev, timestamp: "" }));
              }
            }}
            className="btn-sm-secondary whitespace-nowrap"
          >
            Now
          </button>
        </div>
        {errors.timestamp && <p className="error-text">{errors.timestamp}</p>}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="price" className="label">
            Price per Liter (€) *{" "}
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
            Amount (Liters) *{" "}
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
            Kilometers Since Last Refuel *
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
            Estimated Fuel Consumption (L/100km) *{" "}
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
              Total Cost: {totalCost.toFixed(2)} €
            </span>
          </p>
          {formData.kilometers_since_last_refuel > 0 && formData.amount > 0 && (
            <p className="calculation-text mt-1">
              Actual Consumption:{" "}
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
                  vs estimated)
                </span>
              )}
            </p>
          )}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="notes" className="label">
          Notes (optional)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          value={formData.notes || ""}
          onChange={handleChange}
          className={`input ${errors.notes ? "border-red-300" : ""}`}
          placeholder="e.g. Shell gas station, A1 rest stop..."
          maxLength={500}
        />
        {errors.notes && <p className="error-text">{errors.notes}</p>}
        {formData.notes && (
          <p className="mt-1 text-xs text-secondary">
            {formData.notes.length}/500 characters
          </p>
        )}
      </div>
    </StandardForm>
  );
}
