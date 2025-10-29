import { useState } from "react";
import { MetricCreate, MetricDefinition } from "@/lib/api";

interface AddMetricValueFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (metricData: MetricCreate) => void;
  definition: MetricDefinition | null;
}

export default function AddMetricValueForm({
  isOpen,
  onClose,
  onSubmit,
  definition,
}: AddMetricValueFormProps) {
  const [formData, setFormData] = useState({
    notes: "",
  });

  const [fieldValues, setFieldValues] = useState<
    Record<string, string | number | boolean>
  >({});

  const handleFieldValueChange = (
    fieldName: string,
    value: string | number | boolean
  ) => {
    setFieldValues((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!definition) {
      alert("No metric definition selected");
      return;
    }

    // Validate required fields
    for (const field of definition.fields) {
      if (
        field.required &&
        (fieldValues[field.name] === undefined ||
          fieldValues[field.name] === "")
      ) {
        alert(`Field "${field.name}" is required`);
        return;
      }
    }

    // Submit
    onSubmit({
      metric_id: definition.id,
      data: { ...fieldValues },
      notes: formData.notes.trim() || undefined,
    });

    // Reset form
    setFormData({ notes: "" });
    setFieldValues({});
    onClose();
  };

  const renderFieldInput = (field: any) => {
    const value = fieldValues[field.name] ?? field.default_value ?? "";

    switch (field.type) {
      case "number":
        return (
          <input
            type="number"
            step="any"
            className="input"
            value={value as number}
            onChange={(e) =>
              handleFieldValueChange(
                field.name,
                parseFloat(e.target.value) || 0
              )
            }
            required={field.required}
          />
        );
      case "boolean":
        return (
          <select
            className="input"
            value={value ? "true" : "false"}
            onChange={(e) =>
              handleFieldValueChange(field.name, e.target.value === "true")
            }
            required={field.required}
          >
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        );
      case "text":
      default:
        return (
          <input
            type="text"
            className="input"
            value={value as string}
            onChange={(e) => handleFieldValueChange(field.name, e.target.value)}
            required={field.required}
          />
        );
    }
  };

  if (!isOpen || !definition) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Add Value: {definition.title}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {definition.category}{" "}
                {definition.unit && `(${definition.unit})`}
              </p>
              {definition.description && (
                <p className="text-sm text-gray-500 mt-1">
                  {definition.description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Data Fields */}
            <div className="space-y-4">
              {definition.fields.map((field, index) => (
                <div key={index}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {field.name}
                    {field.required && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                    {field.description && (
                      <span className="text-gray-500 text-xs ml-2">
                        - {field.description}
                      </span>
                    )}
                  </label>
                  {renderFieldInput(field)}
                </div>
              ))}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                className="input"
                rows={3}
                placeholder="Additional notes about this entry..."
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Add Value
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
