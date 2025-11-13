import React, { useState } from "react";

import { DataPointCreate } from "@/lib/api";
import { StandardForm } from "../common/StandardForm";
import { useTranslation } from "@/lib/i18n/LanguageContext";

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
  const { t } = useTranslation();
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
      newErrors.value = t.forms.valueMustBeNumber;
    }

    // Label validation
    if (!formData.label || formData.label.trim().length === 0) {
      newErrors.label = t.forms.labelRequired;
    } else if (formData.label.trim().length > 100) {
      newErrors.label = t.forms.labelTooLong;
    }

    // Timestamp validation
    if (formData.timestamp) {
      const selectedDate = new Date(formData.timestamp);
      const now = new Date();
      if (isNaN(selectedDate.getTime())) {
        newErrors.timestamp = t.forms.invalidDateFormat;
      } else if (selectedDate > now) {
        newErrors.timestamp = t.forms.dateCannotBeFuture;
      }
    } else {
      newErrors.timestamp = t.forms.dateTimeRequired;
    }

    // Notes validation (optional but with length limit)
    if (formData.notes && formData.notes.length > 500) {
      newErrors.notes = t.forms.notesTooLong;
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
    <StandardForm
      title={t.dataTracking.addDataPoint}
      onSubmit={handleSubmit}
      actions={
        <>
          <button type="submit" className="btn-primary flex-1">
            {t.dataTracking.addDataPoint}
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
      }
    >
      <div className="form-row">
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
              max={new Date().toISOString().slice(0, 16)}
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
                  timestamp: new Date().toISOString().slice(0, 16),
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

        <div className="form-group">
          <label htmlFor="value" className="label">
            {t.forms.numericalValue} *
          </label>
          <input
            type="number"
            step="any"
            id="value"
            name="value"
            value={formData.value || ""}
            onChange={handleChange}
            className={`input ${errors.value ? "border-red-300" : ""}`}
            placeholder={t.forms.placeholders.value}
            required
          />
          {errors.value && <p className="error-text">{errors.value}</p>}
        </div>
      </div>

      <div className="form-group relative">
        <label htmlFor="label" className="label">
          {t.forms.labelTopic} *
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
          className={`input ${errors.label ? "border-red-300" : ""}`}
          placeholder={t.forms.placeholders.label}
          maxLength={100}
          required
        />

        {/* Suggestions Dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="suggestions-dropdown">
            {filteredSuggestions.slice(0, 10).map((label, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleLabelSuggestionClick(label)}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none text-sm text-primary"
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {errors.label && <p className="error-text">{errors.label}</p>}
        {!errors.label && existingLabels.length > 0 && (
          <p className="mt-1 text-xs text-secondary">
            {t.forms.clickForSuggestions}
          </p>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="notes" className="label">
          {t.forms.notesOptional}
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          value={formData.notes || ""}
          onChange={handleChange}
          className={`input ${errors.notes ? "border-red-300" : ""}`}
          placeholder={t.forms.placeholders.notes}
          maxLength={500}
        />
        {errors.notes && <p className="error-text">{errors.notes}</p>}
        {formData.notes && (
          <p className="mt-1 text-xs text-secondary">
            {formData.notes.length}/500 {t.forms.charactersUsed}
          </p>
        )}
      </div>
    </StandardForm>
  );
}
