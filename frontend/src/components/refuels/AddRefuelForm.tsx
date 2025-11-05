import React, { useState } from "react";
import { RefuelMetricCreate } from "../../lib/api";

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
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
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
      } else {
        isValid = true; // For notes and other text fields
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
          : undefined,
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

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Add Refuel Entry</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="timestamp"
            className="block text-sm font-medium text-gray-700"
          >
            Date & Time
          </label>
          <div className="flex gap-2">
            <input
              type="datetime-local"
              id="timestamp"
              name="timestamp"
              value={formData.timestamp || ""}
              max={new Date().toISOString().slice(0, 16)}
              onChange={handleChange}
              className={`mt-1 flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                errors.timestamp ? "border-red-300" : ""
              }`}
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
              className="mt-1 px-3 py-2 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 whitespace-nowrap"
            >
              Set to Now
            </button>
          </div>
          {errors.timestamp && (
            <p className="mt-1 text-sm text-red-600">{errors.timestamp}</p>
          )}
          {!errors.timestamp && (
            <p className="mt-1 text-xs text-gray-500">
              Set the date and time when you refueled. Defaults to now for
              current entries.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="price"
              className="block text-sm font-medium text-gray-700"
            >
              Price per Liter (€){" "}
              <span className="text-xs text-gray-500">(0.01 - 10)</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max="10"
              id="price"
              name="price"
              value={formData.price || ""}
              onChange={handleChange}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                errors.price ? "border-red-300" : ""
              }`}
              placeholder="1.589"
            />
            {errors.price && (
              <p className="mt-1 text-sm text-red-600">{errors.price}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="amount"
              className="block text-sm font-medium text-gray-700"
            >
              Amount (Liters){" "}
              <span className="text-xs text-gray-500">(0.01 - 100)</span>
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
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                errors.amount ? "border-red-300" : ""
              }`}
              placeholder="45.20"
            />
            {errors.amount && (
              <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="kilometers_since_last_refuel"
              className="block text-sm font-medium text-gray-700"
            >
              Kilometers Since Last Refuel
            </label>
            <input
              type="number"
              step="1"
              min="1"
              id="kilometers_since_last_refuel"
              name="kilometers_since_last_refuel"
              value={formData.kilometers_since_last_refuel || ""}
              onChange={handleChange}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                errors.kilometers_since_last_refuel ? "border-red-300" : ""
              }`}
              placeholder="450"
            />
            {errors.kilometers_since_last_refuel && (
              <p className="mt-1 text-sm text-red-600">
                {errors.kilometers_since_last_refuel}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="estimated_fuel_consumption"
              className="block text-sm font-medium text-gray-700"
            >
              Estimated Fuel Consumption (L/100km){" "}
              <span className="text-xs text-gray-500">(0.1 - 20.0)</span>
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
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                errors.estimated_fuel_consumption ? "border-red-300" : ""
              }`}
              placeholder="7.5"
            />
            {errors.estimated_fuel_consumption && (
              <p className="mt-1 text-sm text-red-600">
                {errors.estimated_fuel_consumption}
              </p>
            )}
          </div>
        </div>

        {formData.price > 0 && formData.amount > 0 && (
          <div className="bg-blue-50 p-3 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Total Cost: {totalCost.toFixed(2)} €</strong>
            </p>
            {formData.kilometers_since_last_refuel > 0 &&
              formData.amount > 0 && (
                <p className="text-sm text-blue-800 mt-1">
                  Actual Consumption:{" "}
                  <strong>
                    {(
                      (formData.amount /
                        formData.kilometers_since_last_refuel) *
                      100
                    ).toFixed(1)}{" "}
                    L/100km
                  </strong>
                  {formData.estimated_fuel_consumption > 0 && (
                    <span
                      className={`ml-2 ${
                        (formData.amount /
                          formData.kilometers_since_last_refuel) *
                          100 >
                        formData.estimated_fuel_consumption
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      (
                      {(formData.amount /
                        formData.kilometers_since_last_refuel) *
                        100 >
                      formData.estimated_fuel_consumption
                        ? "+"
                        : ""}
                      {(
                        (formData.amount /
                          formData.kilometers_since_last_refuel) *
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

        <div>
          <label
            htmlFor="notes"
            className="block text-sm font-medium text-gray-700"
          >
            Notes (optional)
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={2}
            value={formData.notes || ""}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="e.g. Shell gas station, A1 rest stop..."
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Add Entry
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
