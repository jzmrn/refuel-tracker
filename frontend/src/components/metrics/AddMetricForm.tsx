import { useState } from "react";

interface MetricField {
  key: string;
  value: string | number | boolean;
  type: "text" | "number" | "boolean";
}

interface AddMetricFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (metricData: {
    metric_name: string;
    category: string;
    data: Record<string, string | number | boolean>;
    notes?: string;
  }) => void;
}

export default function AddMetricForm({
  isOpen,
  onClose,
  onSubmit,
}: AddMetricFormProps) {
  const [formData, setFormData] = useState({
    metric_name: "",
    category: "",
    notes: "",
  });

  const [fields, setFields] = useState<MetricField[]>([
    { key: "", value: "", type: "text" },
  ]);

  const handleAddField = () => {
    setFields([...fields, { key: "", value: "", type: "text" }]);
  };

  const handleRemoveField = (index: number) => {
    if (fields.length > 1) {
      setFields(fields.filter((_, i) => i !== index));
    }
  };

  const handleFieldChange = (
    index: number,
    field: keyof MetricField,
    value: string | number | boolean
  ) => {
    const updatedFields = [...fields];
    if (field === "type") {
      // Convert value when type changes
      const newType = value as "text" | "number" | "boolean";
      let convertedValue: string | number | boolean =
        updatedFields[index].value;

      if (newType === "number") {
        convertedValue =
          typeof convertedValue === "string"
            ? parseFloat(convertedValue) || 0
            : Number(convertedValue);
      } else if (newType === "boolean") {
        convertedValue = Boolean(convertedValue);
      } else {
        convertedValue = String(convertedValue);
      }

      updatedFields[index] = {
        ...updatedFields[index],
        type: newType,
        value: convertedValue,
      };
    } else {
      updatedFields[index] = {
        ...updatedFields[index],
        [field]: value,
      };
    }
    setFields(updatedFields);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!formData.metric_name.trim() || !formData.category.trim()) {
      alert("Please fill in metric name and category");
      return;
    }

    // Validate fields
    const validFields = fields.filter((f) => f.key.trim() !== "");
    if (validFields.length === 0) {
      alert("Please add at least one data field");
      return;
    }

    // Check for duplicate keys
    const keys = validFields.map((f) => f.key.trim());
    if (new Set(keys).size !== keys.length) {
      alert("Field names must be unique");
      return;
    }

    // Build data object
    const data: Record<string, string | number | boolean> = {};
    validFields.forEach((field) => {
      data[field.key.trim()] = field.value;
    });

    // Submit
    onSubmit({
      metric_name: formData.metric_name.trim(),
      category: formData.category.trim(),
      data,
      notes: formData.notes.trim() || undefined,
    });

    // Reset form
    setFormData({ metric_name: "", category: "", notes: "" });
    setFields([{ key: "", value: "", type: "text" }]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Add New Metric
            </h2>
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

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Metric Name *
                </label>
                <input
                  type="text"
                  required
                  className="input"
                  placeholder="e.g., Weight, Sleep Hours"
                  value={formData.metric_name}
                  onChange={(e) =>
                    setFormData({ ...formData, metric_name: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <input
                  type="text"
                  required
                  className="input"
                  placeholder="e.g., Health, Fitness, Study"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Data Fields */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Data Fields *
                </label>
                <button
                  type="button"
                  onClick={handleAddField}
                  className="btn btn-secondary text-sm"
                >
                  Add Field
                </button>
              </div>

              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Field name"
                        className="input"
                        value={field.key}
                        onChange={(e) =>
                          handleFieldChange(index, "key", e.target.value)
                        }
                      />
                    </div>

                    <div className="w-24">
                      <select
                        className="input"
                        value={field.type}
                        onChange={(e) =>
                          handleFieldChange(index, "type", e.target.value)
                        }
                      >
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="boolean">Boolean</option>
                      </select>
                    </div>

                    <div className="flex-1">
                      {field.type === "text" && (
                        <input
                          type="text"
                          placeholder="Value"
                          className="input"
                          value={field.value as string}
                          onChange={(e) =>
                            handleFieldChange(index, "value", e.target.value)
                          }
                        />
                      )}
                      {field.type === "number" && (
                        <input
                          type="number"
                          step="any"
                          placeholder="Value"
                          className="input"
                          value={field.value as number}
                          onChange={(e) =>
                            handleFieldChange(
                              index,
                              "value",
                              parseFloat(e.target.value) || 0
                            )
                          }
                        />
                      )}
                      {field.type === "boolean" && (
                        <select
                          className="input"
                          value={field.value ? "true" : "false"}
                          onChange={(e) =>
                            handleFieldChange(
                              index,
                              "value",
                              e.target.value === "true"
                            )
                          }
                        >
                          <option value="true">True</option>
                          <option value="false">False</option>
                        </select>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveField(index)}
                      disabled={fields.length === 1}
                      className="text-red-500 hover:text-red-700 disabled:text-gray-300"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                className="input"
                rows={3}
                placeholder="Additional notes about this metric entry..."
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
                Add Metric
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
