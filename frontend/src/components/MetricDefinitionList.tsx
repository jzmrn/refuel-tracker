import { useState, useEffect } from "react";
import { MetricDefinition } from "@/lib/api";
import apiService from "@/lib/api";

interface MetricDefinitionListProps {
  onSelectDefinition: (definition: MetricDefinition) => void;
  refreshKey: number;
}

export default function MetricDefinitionList({
  onSelectDefinition,
  refreshKey,
}: MetricDefinitionListProps) {
  const [definitions, setDefinitions] = useState<MetricDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    fetchDefinitions();
    fetchCategories();
  }, [refreshKey, selectedCategory]);

  const fetchDefinitions = async () => {
    try {
      setLoading(true);
      const data = await apiService.getMetricDefinitions(
        selectedCategory || undefined
      );
      setDefinitions(data);
    } catch (error) {
      console.error("Error fetching metric definitions:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await apiService.getMetricDefinitionCategories();
      setCategories(data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this metric definition?")) {
      return;
    }

    try {
      await apiService.deleteMetricDefinition(id);
      setDefinitions(definitions.filter((d) => d.id !== id));
    } catch (error) {
      console.error("Error deleting metric definition:", error);
      alert("Failed to delete metric definition");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Loading definitions...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Category Filter */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">
          Filter by category:
        </label>
        <select
          className="input w-48"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      {/* Definitions List */}
      {definitions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <svg
            className="w-12 h-12 mx-auto mb-4 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-lg font-medium mb-2">No metric definitions yet</p>
          <p>Create your first metric definition to start tracking data</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {definitions.map((definition) => (
            <div
              key={definition.id}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium text-gray-900">
                      {definition.title}
                    </h3>
                    <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                      {definition.category}
                    </span>
                    {definition.unit && (
                      <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                        {definition.unit}
                      </span>
                    )}
                  </div>

                  {definition.description && (
                    <p className="text-sm text-gray-600 mb-3">
                      {definition.description}
                    </p>
                  )}

                  <div className="mb-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Fields:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {definition.fields.map((field, index) => (
                        <span
                          key={index}
                          className="inline-block bg-gray-100 rounded px-2 py-1 text-xs"
                        >
                          <span className="font-medium">{field.name}</span>
                          <span className="text-gray-500 ml-1">
                            ({field.type}
                            {field.required && ", required"})
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-3">
                    <button
                      onClick={() => onSelectDefinition(definition)}
                      className="btn btn-primary text-sm"
                    >
                      Add Values
                    </button>
                    <button
                      onClick={() => handleDelete(definition.id)}
                      className="btn btn-danger text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="text-right text-sm text-gray-500">
                  <p>
                    Created:{" "}
                    {new Date(definition.created_at).toLocaleDateString()}
                  </p>
                  {definition.updated_at !== definition.created_at && (
                    <p>
                      Updated:{" "}
                      {new Date(definition.updated_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
