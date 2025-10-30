import { useState, useEffect } from "react";
import apiService, { Unit, UnitCreate } from "../lib/api";
import ConfirmationDialog from "../components/ConfirmationDialog";
import ErrorDialog from "../components/ErrorDialog";

export default function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [deletingUnit, setDeletingUnit] = useState<Unit | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [showError, setShowError] = useState<boolean>(false);

  useEffect(() => {
    loadUnits();
  }, []);

  const loadUnits = async () => {
    try {
      setLoading(true);
      const data = await apiService.getUnits();
      setUnits(data);
    } catch (error) {
      console.error("Error loading units:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUnit = async (unitData: UnitCreate) => {
    try {
      await apiService.createUnit(unitData);
      await loadUnits();
      setShowCreateForm(false);
    } catch (error: any) {
      console.error("Error creating unit:", error);

      let errorMsg = "Failed to create unit. Please try again.";
      if (error?.response?.data?.detail) {
        errorMsg = error.response.data.detail;
      } else if (error?.message) {
        errorMsg = error.message;
      }

      setErrorMessage(errorMsg);
      setShowError(true);
    }
  };

  const handleUpdateUnit = async (
    id: string,
    unitData: Partial<UnitCreate>
  ) => {
    try {
      await apiService.updateUnit(id, unitData);
      await loadUnits();
      setEditingUnit(null);
    } catch (error: any) {
      console.error("Error updating unit:", error);

      let errorMsg = "Failed to update unit. Please try again.";
      if (error?.response?.data?.detail) {
        errorMsg = error.response.data.detail;
      } else if (error?.message) {
        errorMsg = error.message;
      }

      setErrorMessage(errorMsg);
      setShowError(true);
    }
  };

  const handleDeleteUnit = async (unit: Unit) => {
    setDeletingUnit(unit);
  };

  const confirmDeleteUnit = async () => {
    if (!deletingUnit) return;

    try {
      await apiService.deleteUnit(deletingUnit.id);
      await loadUnits();
      setDeletingUnit(null);
    } catch (error: any) {
      console.error("Error deleting unit:", error);

      let errorMsg = "Failed to delete unit. Please try again.";
      if (error?.response?.data?.detail) {
        errorMsg = error.response.data.detail;
      } else if (error?.message) {
        errorMsg = error.message;
      }

      setErrorMessage(errorMsg);
      setShowError(true);
      setDeletingUnit(null);
    }
  };

  const handleInitializeDefaults = async () => {
    try {
      setLoading(true);
      await apiService.initializeDefaultUnits();
      await loadUnits();
    } catch (error: any) {
      console.error("Error initializing default units:", error);

      let errorMsg = "Failed to initialize default units. Please try again.";
      if (error?.response?.data?.detail) {
        errorMsg = error.response.data.detail;
      } else if (error?.message) {
        errorMsg = error.message;
      }

      setErrorMessage(errorMsg);
      setShowError(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Units</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="btn btn-primary"
        >
          Add Unit
        </button>
      </div>

      {showCreateForm && (
        <UnitForm
          onSubmit={handleCreateUnit}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      <div className="grid gap-4">
        {units.map((unit) => (
          <div
            key={unit.id}
            className="bg-white shadow rounded-lg p-4 border border-gray-200"
          >
            {editingUnit?.id === unit.id ? (
              <UnitForm
                unit={unit}
                onSubmit={(data) => handleUpdateUnit(unit.id, data)}
                onCancel={() => setEditingUnit(null)}
              />
            ) : (
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  {/* Symbol Avatar */}
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center shadow-md">
                      <span className="text-white font-bold text-sm font-mono">
                        {unit.symbol}
                      </span>
                    </div>
                  </div>

                  {/* Unit Details */}
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      {unit.name}
                    </h3>
                    <p className="text-xs text-gray-600">Type: {unit.type}</p>
                    {unit.description && (
                      <p className="text-xs text-gray-500 mt-1">
                        {unit.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setEditingUnit(unit)}
                    className="btn btn-secondary text-xs px-3 py-1"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteUnit(unit)}
                    className="btn bg-red-100 text-red-700 hover:bg-red-200 focus:ring-red-500 text-xs px-3 py-1"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {units.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            No units found. Create your first unit to get started.
          </div>
          <button
            onClick={handleInitializeDefaults}
            className="btn bg-green-600 text-white hover:bg-green-700 focus:ring-green-500"
          >
            Initialize Default Units
          </button>
        </div>
      )}

      <ConfirmationDialog
        isOpen={!!deletingUnit}
        title="Delete Unit"
        message={`Are you sure you want to delete "${deletingUnit?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDeleteUnit}
        onCancel={() => setDeletingUnit(null)}
      />

      <ErrorDialog
        isOpen={showError}
        title="Cannot Delete Unit"
        message={errorMessage}
        onClose={() => setShowError(false)}
        variant="error"
      />
    </div>
  );
}

interface UnitFormProps {
  unit?: Unit;
  onSubmit: (data: UnitCreate) => void;
  onCancel: () => void;
}

function UnitForm({ unit, onSubmit, onCancel }: UnitFormProps) {
  const [formData, setFormData] = useState<UnitCreate>({
    name: unit?.name || "",
    symbol: unit?.symbol || "",
    type: unit?.type || "text",
    description: unit?.description || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {unit ? "Edit Unit" : "Create New Unit"}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Name
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="input"
            placeholder="e.g., Currency, Percentage"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Symbol
          </label>
          <input
            type="text"
            required
            value={formData.symbol}
            onChange={(e) =>
              setFormData({ ...formData, symbol: e.target.value })
            }
            className="input"
            placeholder="e.g., $, %, kg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Type
          </label>
          <select
            value={formData.type}
            onChange={(e) =>
              setFormData({
                ...formData,
                type: e.target.value as "text" | "number" | "boolean",
              })
            }
            className="input"
          >
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="boolean">Boolean</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Description (Optional)
          </label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            className="input"
            rows={3}
            placeholder="Describe what this unit represents..."
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {unit ? "Update" : "Create"} Unit
          </button>
        </div>
      </form>
    </div>
  );
}
