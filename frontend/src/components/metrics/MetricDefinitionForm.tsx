import { useState, useEffect } from "react";
import {
  MetricDefinitionCreate,
  MetricFieldDefinition,
  Unit,
  Category,
} from "@/lib/api";
import apiService from "@/lib/api";

interface MetricDefinitionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (definition: MetricDefinitionCreate) => void;
}

export default function MetricDefinitionForm({
  isOpen,
  onClose,
  onSubmit,
}: MetricDefinitionFormProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category_id: "",
  });

  const [fields, setFields] = useState<MetricFieldDefinition[]>([
    { name: "", unit_id: "", required: true },
  ]);

  const [units, setUnits] = useState<Unit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  useEffect(() => {
    loadUnits();
    loadCategories();
  }, []);

  const loadUnits = async () => {
    try {
      const data = await apiService.getUnits();
      setUnits(data);
      // Update initial field with first unit if available and field is still empty
      if (data.length > 0 && fields.length === 1 && !fields[0].unit_id) {
        setFields([{ name: "", unit_id: data[0].id, required: true }]);
      }
    } catch (error) {
      console.error("Error loading units:", error);
    } finally {
      setLoadingUnits(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await apiService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error("Error loading categories:", error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleAddField = () => {
    const defaultUnitId = units.length > 0 ? units[0].id : "";
    setFields([
      ...fields,
      { name: "", unit_id: defaultUnitId, required: true },
    ]);
  };

  const handleRemoveField = (index: number) => {
    if (fields.length > 1) {
      setFields(fields.filter((_, i) => i !== index));
    }
  };

  const handleFieldChange = (
    index: number,
    field: keyof MetricFieldDefinition,
    value: any
  ) => {
    const updatedFields = [...fields];
    updatedFields[index] = { ...updatedFields[index], [field]: value };
    setFields(updatedFields);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!formData.title.trim() || !formData.category_id.trim()) {
      alert("Please fill in title and category");
      return;
    }

    // Validate fields
    const validFields = fields.filter((f) => f.name.trim() !== "");
    if (validFields.length === 0) {
      alert("Please add at least one field");
      return;
    }

    // Check for missing unit_id in valid fields
    const fieldsWithoutUnit = validFields.filter((f) => !f.unit_id.trim());
    if (fieldsWithoutUnit.length > 0) {
      alert("Please select a unit for all fields");
      return;
    }

    // Check for duplicate field names
    const fieldNames = validFields.map((f) => f.name.trim());
    if (new Set(fieldNames).size !== fieldNames.length) {
      alert("Field names must be unique");
      return;
    }

    // Submit
    onSubmit({
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      category_id: formData.category_id.trim(),
      fields: validFields.map((field) => ({
        ...field,
        name: field.name.trim(),
      })),
    });

    // Reset form
    setFormData({ title: "", description: "", category_id: "" });
    const defaultUnitId = units.length > 0 ? units[0].id : "";
    setFields([{ name: "", unit_id: defaultUnitId, required: true }]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Create Metric Definition
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
                  Title *
                </label>
                <input
                  type="text"
                  required
                  className="input"
                  placeholder="e.g., Daily Weight, Exercise Duration"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  required
                  className="input"
                  value={formData.category_id}
                  onChange={(e) =>
                    setFormData({ ...formData, category_id: e.target.value })
                  }
                  disabled={loadingCategories}
                >
                  {loadingCategories ? (
                    <option value="">Loading...</option>
                  ) : (
                    <>
                      <option value="">Select Category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                {categories.length === 0 && !loadingCategories && (
                  <p className="text-sm text-amber-600 mt-1">
                    <a
                      href="/categories"
                      className="underline hover:text-amber-800"
                    >
                      Create categories first
                    </a>
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                className="input"
                rows={3}
                placeholder="Describe what this metric tracks..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            {/* Field Definitions */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Data Fields *
                </label>
                <div className="flex gap-2">
                  {units.length === 0 && !loadingUnits && (
                    <span className="text-sm text-amber-600">
                      <a
                        href="/units"
                        className="underline hover:text-amber-800"
                      >
                        Create units first
                      </a>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleAddField}
                    className="btn btn-secondary text-sm"
                    disabled={units.length === 0}
                  >
                    Add Field
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Field name"
                        className="input"
                        value={field.name}
                        onChange={(e) =>
                          handleFieldChange(index, "name", e.target.value)
                        }
                      />
                    </div>

                    <div className="w-32">
                      <select
                        className="input"
                        value={field.unit_id}
                        onChange={(e) =>
                          handleFieldChange(index, "unit_id", e.target.value)
                        }
                        disabled={loadingUnits}
                      >
                        {loadingUnits ? (
                          <option value="">Loading...</option>
                        ) : (
                          <>
                            <option value="">Select Unit</option>
                            {units.map((unit) => (
                              <option key={unit.id} value={unit.id}>
                                {unit.name} ({unit.symbol})
                              </option>
                            ))}
                          </>
                        )}
                      </select>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={field.required}
                        onChange={(e) =>
                          handleFieldChange(index, "required", e.target.checked)
                        }
                      />
                      <span className="text-sm text-gray-700">Required</span>
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
                Create Definition
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
