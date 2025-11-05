import React, { useState } from "react";

import { DataPointCreate } from "@/lib/api";

interface AddDataPointFormProps {
  onSubmit: (dataPoint: DataPointCreate) => void;
  existingLabels: string[];
  onCancel?: () => void;
}

export default function AddDataPointForm({
  onSubmit,
  existingLabels,
  onCancel,
}: AddDataPointFormProps) {
  const [formData, setFormData] = useState<DataPointCreate>({
    timestamp: new Date().toISOString().slice(0, 16), // Current date/time in YYYY-MM-DDTHH:mm format
    value: 0,
    label: "",
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;

    let processedValue: string | number = value;
    if (name === "value") {
      processedValue = parseFloat(value) || 0;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: processedValue,
    }));

    // Show suggestions when typing in label field (if already showing)
    if (name === "label" && showSuggestions) {
      // Keep suggestions visible while typing if they were already showing
      setShowSuggestions(existingLabels.length > 0);
    }

    // Real-time validation - clear error if value is now valid
    if (errors[name]) {
      let isValid = false;

      if (name === "value") {
        isValid = !isNaN(parseFloat(value));
      } else if (name === "label") {
        isValid = value.trim().length > 0;
      } else if (name === "timestamp") {
        const selectedDate = new Date(value);
        isValid = !isNaN(selectedDate.getTime()) && selectedDate <= new Date();
      } else {
        isValid = true; // For notes and other optional fields
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

    // Value validation
    if (isNaN(formData.value)) {
      newErrors.value = "Value must be a valid number";
    }

    // Label validation
    if (!formData.label || formData.label.trim().length === 0) {
      newErrors.label = "Label is required";
    } else if (formData.label.trim().length > 100) {
      newErrors.label = "Label must be 100 characters or less";
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
        label: formData.label.trim(),
        timestamp: new Date(formData.timestamp).toISOString(),
        notes: formData.notes?.trim() || undefined,
      };
      onSubmit(submissionData);

      // Reset form
      setFormData({
        timestamp: new Date().toISOString().slice(0, 16), // Reset to current date/time
        value: 0,
        label: "",
        notes: "",
      });
      setShowSuggestions(false);
    }
  };

  const handleLabelSuggestionClick = (label: string) => {
    setFormData((prev) => ({
      ...prev,
      label,
    }));
    setShowSuggestions(false);
    // Clear label error if it exists
    if (errors.label) {
      setErrors((prev) => ({ ...prev, label: "" }));
    }
  };

  const filteredSuggestions =
    formData.label.trim() === ""
      ? existingLabels // Show all labels when no text is entered
      : existingLabels.filter((label) =>
          label.toLowerCase().includes(formData.label.toLowerCase()),
        );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="timestamp"
            className="block text-sm font-medium text-gray-700"
          >
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
              className={`mt-1 flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
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
              className="mt-1 px-3 py-2 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 whitespace-nowrap"
            >
              Now
            </button>
          </div>
          {errors.timestamp && (
            <p className="mt-1 text-sm text-red-600">{errors.timestamp}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="value"
            className="block text-sm font-medium text-gray-700"
          >
            Numerical Value *
          </label>
          <input
            type="number"
            step="any"
            id="value"
            name="value"
            value={formData.value || ""}
            onChange={handleChange}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
              errors.value ? "border-red-300" : ""
            }`}
            placeholder="0"
            required
          />
          {errors.value && (
            <p className="mt-1 text-sm text-red-600">{errors.value}</p>
          )}
        </div>
      </div>

      <div className="relative">
        <label
          htmlFor="label"
          className="block text-sm font-medium text-gray-700"
        >
          Label/Topic *
        </label>
        <input
          type="text"
          id="label"
          name="label"
          value={formData.label}
          onChange={handleChange}
          onFocus={() => setShowSuggestions(existingLabels.length > 0)}
          onBlur={() => {
            // Delay hiding suggestions to allow clicks
            setTimeout(() => setShowSuggestions(false), 200);
          }}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
            errors.label ? "border-red-300" : ""
          }`}
          placeholder="e.g., Weight, Blood Pressure, Steps, Temperature..."
          maxLength={100}
          required
        />

        {/* Suggestions Dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
            {filteredSuggestions.slice(0, 10).map((label, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleLabelSuggestionClick(label)}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none text-sm"
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {errors.label && (
          <p className="mt-1 text-sm text-red-600">{errors.label}</p>
        )}
        {!errors.label && existingLabels.length > 0 && (
          <p className="mt-1 text-xs text-gray-500">
            Click on the field to see suggestions from your existing labels
          </p>
        )}
      </div>

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
          rows={3}
          value={formData.notes || ""}
          onChange={handleChange}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
            errors.notes ? "border-red-300" : ""
          }`}
          placeholder="Additional context or details about this measurement..."
          maxLength={500}
        />
        {errors.notes && (
          <p className="mt-1 text-sm text-red-600">{errors.notes}</p>
        )}
        {formData.notes && (
          <p className="mt-1 text-xs text-gray-500">
            {formData.notes.length}/500 characters
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium"
        >
          Add Data Point
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-medium"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
