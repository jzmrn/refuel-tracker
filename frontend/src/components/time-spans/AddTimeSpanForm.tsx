import React, { useState } from "react";
import { TimeSpanCreate } from "@/lib/api";
import { StandardForm } from "../common/StandardForm";

interface AddTimeSpanFormProps {
  onSubmit: (timeSpan: TimeSpanCreate) => void;
  existingLabels: string[];
  existingGroups: string[];
  onCancel?: () => void;
}

export default function AddTimeSpanForm({
  onSubmit,
  existingLabels,
  existingGroups,
  onCancel,
}: AddTimeSpanFormProps) {
  const [formData, setFormData] = useState<TimeSpanCreate>({
    start_date: new Date().toISOString().slice(0, 16), // Current date/time in YYYY-MM-DDTHH:mm format
    end_date: "",
    label: "",
    group: "",
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showGroupSuggestions, setShowGroupSuggestions] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Show suggestions when typing in label/group fields (if already showing)
    if (name === "label" && showSuggestions) {
      // Keep suggestions visible while typing if they were already showing
      setShowSuggestions(existingLabels.length > 0);
    }
    if (name === "group" && showGroupSuggestions) {
      // Keep suggestions visible while typing if they were already showing
      setShowGroupSuggestions(existingGroups.length > 0);
    }

    // Real-time validation - clear error if value is now valid
    if (errors[name]) {
      let isValid = false;

      if (name === "label") {
        isValid = value.trim().length > 0;
      } else if (name === "group") {
        isValid = value.trim().length > 0;
      } else if (name === "start_date" || name === "end_date") {
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

    // Label validation
    if (!formData.label || formData.label.trim().length === 0) {
      newErrors.label = "Label is required";
    } else if (formData.label.trim().length > 100) {
      newErrors.label = "Label must be 100 characters or less";
    }

    // Start date validation
    if (formData.start_date) {
      const startDate = new Date(formData.start_date);
      if (isNaN(startDate.getTime())) {
        newErrors.start_date = "Invalid start date format";
      }
    } else {
      newErrors.start_date = "Start date is required";
    }

    // End date validation
    if (formData.end_date) {
      const endDate = new Date(formData.end_date);
      if (isNaN(endDate.getTime())) {
        newErrors.end_date = "Invalid end date format";
      } else if (formData.start_date) {
        const startDate = new Date(formData.start_date);
        if (endDate < startDate) {
          newErrors.end_date = "End date cannot be before start date";
        }
      }
    }

    // Notes validation (optional but with length limit)
    if (formData.notes && formData.notes.length > 500) {
      newErrors.notes = "Notes must be 500 characters or less";
    }

    // Group validation (required with length limit)
    if (!formData.group || formData.group.trim().length === 0) {
      newErrors.group = "Group is required";
    } else if (formData.group.length > 50) {
      newErrors.group = "Group must be 50 characters or less";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      // Convert datetime-local string to ISO string for backend
      const submissionData: any = {
        label: formData.label.trim(),
        start_date: new Date(formData.start_date).toISOString(),
        group: formData.group.trim(),
        notes: formData.notes?.trim() || null, // Use null instead of undefined for empty notes
      };

      // Only include end_date if it has a value
      if (formData.end_date) {
        submissionData.end_date = new Date(formData.end_date).toISOString();
      }
      onSubmit(submissionData);

      // Reset form
      setFormData({
        start_date: new Date().toISOString().slice(0, 16), // Reset to current date/time
        end_date: "",
        label: "",
        group: "",
        notes: "",
      });
      setShowSuggestions(false);
      setShowGroupSuggestions(false);
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

  const handleGroupSuggestionClick = (group: string) => {
    setFormData((prev) => ({
      ...prev,
      group,
    }));
    setShowGroupSuggestions(false);
    // Clear group error if it exists
    if (errors.group) {
      setErrors((prev) => ({ ...prev, group: "" }));
    }
  };

  const filteredSuggestions =
    formData.label.trim() === ""
      ? existingLabels // Show all labels when no text is entered
      : existingLabels.filter((label) =>
          label.toLowerCase().includes(formData.label.toLowerCase()),
        );

  const filteredGroupSuggestions =
    !formData.group || formData.group.trim() === ""
      ? existingGroups // Show all groups when no text is entered
      : existingGroups.filter((group) =>
          group.toLowerCase().includes((formData.group || "").toLowerCase()),
        );

  const setEndDateToNow = () => {
    const now = new Date().toISOString().slice(0, 16);
    setFormData((prev) => ({
      ...prev,
      end_date: now,
    }));
    // Clear error when setting to now
    if (errors.end_date) {
      setErrors((prev) => ({ ...prev, end_date: "" }));
    }
  };

  return (
    <StandardForm
      title="Add Time Span"
      onSubmit={handleSubmit}
      actions={
        <>
          <button type="submit" className="btn-primary flex-1">
            Add Time Span
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
      }
    >
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="start_date" className="label">
            Start Date & Time *
          </label>
          <div className="flex gap-2">
            <input
              type="datetime-local"
              id="start_date"
              name="start_date"
              value={formData.start_date || ""}
              onChange={handleChange}
              className={`input flex-1 ${
                errors.start_date ? "border-red-300" : ""
              }`}
              required
            />
            <button
              type="button"
              onClick={() => {
                setFormData((prev) => ({
                  ...prev,
                  start_date: new Date().toISOString().slice(0, 16),
                }));
                // Clear error when setting to now
                if (errors.start_date) {
                  setErrors((prev) => ({ ...prev, start_date: "" }));
                }
              }}
              className="btn-sm-secondary whitespace-nowrap"
            >
              Now
            </button>
          </div>
          {errors.start_date && (
            <p className="error-text">{errors.start_date}</p>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="end_date" className="label">
            End Date & Time
          </label>
          <div className="flex gap-2">
            <input
              type="datetime-local"
              id="end_date"
              name="end_date"
              value={formData.end_date || ""}
              onChange={handleChange}
              className={`input flex-1 ${
                errors.end_date ? "border-red-300" : ""
              }`}
            />
            <button
              type="button"
              onClick={setEndDateToNow}
              className="btn-sm-secondary whitespace-nowrap"
            >
              Now
            </button>
          </div>
          {errors.end_date && <p className="error-text">{errors.end_date}</p>}
          <p className="mt-1 text-xs text-secondary">
            Leave empty if the activity is ongoing
          </p>
        </div>
      </div>

      <div className="form-group relative">
        <label htmlFor="label" className="label">
          Label/Activity *
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
          placeholder="e.g., Workout, Reading, Project Work, Sleep..."
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
            Click on the field to see suggestions from your existing labels
          </p>
        )}
      </div>

      <div className="form-group relative">
        <label htmlFor="group" className="label">
          Group *
        </label>
        <input
          type="text"
          id="group"
          name="group"
          value={formData.group || ""}
          onChange={handleChange}
          onFocus={() => setShowGroupSuggestions(existingGroups.length > 0)}
          onBlur={() => {
            // Delay hiding suggestions to allow clicks
            setTimeout(() => setShowGroupSuggestions(false), 200);
          }}
          className={`input ${errors.group ? "border-red-300" : ""}`}
          placeholder="e.g., Work, Personal, Health, Hobbies..."
          maxLength={50}
          required
        />

        {/* Group Suggestions Dropdown */}
        {showGroupSuggestions && filteredGroupSuggestions.length > 0 && (
          <div className="suggestions-dropdown">
            {filteredGroupSuggestions.slice(0, 10).map((group, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleGroupSuggestionClick(group)}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none text-sm text-primary"
              >
                {group}
              </button>
            ))}
          </div>
        )}

        {errors.group && <p className="error-text">{errors.group}</p>}
        {!errors.group && existingGroups.length > 0 && (
          <p className="mt-1 text-xs text-secondary">
            Click on the field to see suggestions from your existing groups
          </p>
        )}
      </div>

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
          placeholder="Additional context or details about this activity..."
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
