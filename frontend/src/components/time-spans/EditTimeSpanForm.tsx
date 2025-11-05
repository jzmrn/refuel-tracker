import React, { useState, useEffect } from "react";
import { TimeSpanUpdate, TimeSpanResponse } from "@/lib/api";

interface EditTimeSpanFormProps {
  timeSpan: TimeSpanResponse;
  onSubmit: (id: string, update: TimeSpanUpdate) => void;
  existingLabels: string[];
  existingGroups: string[];
  onCancel: () => void;
}

export default function EditTimeSpanForm({
  timeSpan,
  onSubmit,
  existingLabels,
  existingGroups,
  onCancel,
}: EditTimeSpanFormProps) {
  const [formData, setFormData] = useState<TimeSpanUpdate>({
    start_date: "",
    end_date: "",
    label: "",
    group: "",
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showGroupSuggestions, setShowGroupSuggestions] = useState(false);

  // Initialize form data when timeSpan changes
  useEffect(() => {
    if (timeSpan) {
      setFormData({
        start_date: new Date(timeSpan.start_date).toISOString().slice(0, 16),
        end_date: timeSpan.end_date
          ? new Date(timeSpan.end_date).toISOString().slice(0, 16)
          : "",
        label: timeSpan.label,
        group: timeSpan.group || "General",
        notes: timeSpan.notes || "",
      });
    }
  }, [timeSpan]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Show suggestions when typing in label/group fields (if already showing)
    if (name === "label" && showSuggestions) {
      setShowSuggestions(existingLabels.length > 0);
    }
    if (name === "group" && showGroupSuggestions) {
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
      // Only include fields that have been modified
      const updateData: TimeSpanUpdate = {};

      if (
        formData.start_date &&
        formData.start_date !==
          new Date(timeSpan.start_date).toISOString().slice(0, 16)
      ) {
        updateData.start_date = new Date(formData.start_date).toISOString();
      }

      const originalEndDate = timeSpan.end_date
        ? new Date(timeSpan.end_date).toISOString().slice(0, 16)
        : "";
      if (formData.end_date !== originalEndDate) {
        updateData.end_date = formData.end_date
          ? new Date(formData.end_date).toISOString()
          : null;
      }

      if (formData.label?.trim() !== timeSpan.label) {
        updateData.label = formData.label?.trim();
      }

      const originalGroup = timeSpan.group || "General";
      if ((formData.group || "").trim() !== originalGroup) {
        updateData.group = (formData.group || "").trim() || "General";
      }

      const originalNotes = timeSpan.notes || "";
      if ((formData.notes || "").trim() !== originalNotes) {
        updateData.notes = (formData.notes || "").trim() || null;
      }

      onSubmit(timeSpan.id, updateData);
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
    !formData.label || formData.label.trim() === ""
      ? existingLabels // Show all labels when no text is entered
      : existingLabels.filter((label) =>
          label.toLowerCase().includes(formData.label!.toLowerCase())
        );

  const filteredGroupSuggestions =
    !formData.group || formData.group.trim() === ""
      ? existingGroups // Show all groups when no text is entered
      : existingGroups.filter((group) =>
          group.toLowerCase().includes((formData.group || "").toLowerCase())
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
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Edit Time Span
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="start_date"
              className="block text-sm font-medium text-gray-700"
            >
              Start Date & Time *
            </label>
            <div className="flex gap-2">
              <input
                type="datetime-local"
                id="start_date"
                name="start_date"
                value={formData.start_date || ""}
                onChange={handleChange}
                className={`mt-1 flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
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
                className="mt-1 px-3 py-2 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 whitespace-nowrap"
              >
                Now
              </button>
            </div>
            {errors.start_date && (
              <p className="mt-1 text-sm text-red-600">{errors.start_date}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="end_date"
              className="block text-sm font-medium text-gray-700"
            >
              End Date & Time
            </label>
            <div className="flex gap-2">
              <input
                type="datetime-local"
                id="end_date"
                name="end_date"
                value={formData.end_date || ""}
                onChange={handleChange}
                className={`mt-1 flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                  errors.end_date ? "border-red-300" : ""
                }`}
              />
              <button
                type="button"
                onClick={setEndDateToNow}
                className="mt-1 px-3 py-2 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 whitespace-nowrap"
              >
                Now
              </button>
            </div>
            {errors.end_date && (
              <p className="mt-1 text-sm text-red-600">{errors.end_date}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Leave empty if the activity is ongoing
            </p>
          </div>
        </div>

        <div className="relative">
          <label
            htmlFor="label"
            className="block text-sm font-medium text-gray-700"
          >
            Label/Activity *
          </label>
          <input
            type="text"
            id="label"
            name="label"
            value={formData.label || ""}
            onChange={handleChange}
            onFocus={() => setShowSuggestions(existingLabels.length > 0)}
            onBlur={() => {
              // Delay hiding suggestions to allow clicks
              setTimeout(() => setShowSuggestions(false), 200);
            }}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
              errors.label ? "border-red-300" : ""
            }`}
            placeholder="e.g., Workout, Reading, Project Work, Sleep..."
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
        </div>

        <div className="relative">
          <label
            htmlFor="group"
            className="block text-sm font-medium text-gray-700"
          >
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
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
              errors.group ? "border-red-300" : ""
            }`}
            placeholder="e.g., Work, Personal, Health, Hobbies..."
            maxLength={50}
            required
          />

          {/* Group Suggestions Dropdown */}
          {showGroupSuggestions && filteredGroupSuggestions.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
              {filteredGroupSuggestions.slice(0, 10).map((group, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleGroupSuggestionClick(group)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none text-sm"
                >
                  {group}
                </button>
              ))}
            </div>
          )}

          {errors.group && (
            <p className="mt-1 text-sm text-red-600">{errors.group}</p>
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
            placeholder="Additional context or details about this activity..."
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

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium"
          >
            Update Time Span
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
