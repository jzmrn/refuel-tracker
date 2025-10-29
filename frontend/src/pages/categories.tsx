import { useState, useEffect } from "react";
import apiService, { Category, CategoryCreate } from "../lib/api";
import ConfirmationDialog from "../components/ConfirmationDialog";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(
    null
  );

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await apiService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error("Error loading categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async (categoryData: CategoryCreate) => {
    try {
      await apiService.createCategory(categoryData);
      await loadCategories();
      setShowCreateForm(false);
    } catch (error) {
      console.error("Error creating category:", error);
    }
  };

  const handleUpdateCategory = async (
    id: string,
    categoryData: Partial<CategoryCreate>
  ) => {
    try {
      await apiService.updateCategory(id, categoryData);
      await loadCategories();
      setEditingCategory(null);
    } catch (error) {
      console.error("Error updating category:", error);
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    setDeletingCategory(category);
  };

  const confirmDeleteCategory = async () => {
    if (!deletingCategory) return;

    try {
      await apiService.deleteCategory(deletingCategory.id);
      await loadCategories();
      setDeletingCategory(null);
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  };

  const handleInitializeDefaults = async () => {
    try {
      setLoading(true);
      await apiService.initializeDefaultCategories();
      await loadCategories();
    } catch (error) {
      console.error("Error initializing default categories:", error);
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
        <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="btn btn-primary"
        >
          Add Category
        </button>
      </div>

      {showCreateForm && (
        <CategoryForm
          onSubmit={handleCreateCategory}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      <div className="grid gap-4">
        {categories.map((category) => (
          <div
            key={category.id}
            className="bg-white shadow rounded-lg p-4 border border-gray-200"
          >
            {editingCategory?.id === category.id ? (
              <CategoryForm
                category={category}
                onSubmit={(data) => handleUpdateCategory(category.id, data)}
                onCancel={() => setEditingCategory(null)}
              />
            ) : (
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  {category.color && (
                    <div className="flex items-center justify-center">
                      <div
                        className="w-6 h-6 rounded-full border border-gray-300"
                        style={{ backgroundColor: category.color }}
                      />
                    </div>
                  )}
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      {category.name}
                    </h3>
                    {category.description && (
                      <p className="text-sm text-gray-500">
                        {category.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setEditingCategory(category)}
                    className="btn btn-secondary text-xs px-3 py-1"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(category)}
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

      {categories.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            No categories found. Create your first category to get started.
          </div>
          <button
            onClick={handleInitializeDefaults}
            className="btn bg-green-600 text-white hover:bg-green-700 focus:ring-green-500"
          >
            Initialize Default Categories
          </button>
        </div>
      )}

      <ConfirmationDialog
        isOpen={!!deletingCategory}
        title="Delete Category"
        message={`Are you sure you want to delete "${deletingCategory?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDeleteCategory}
        onCancel={() => setDeletingCategory(null)}
      />
    </div>
  );
}

interface CategoryFormProps {
  category?: Category;
  onSubmit: (data: CategoryCreate) => void;
  onCancel: () => void;
}

function CategoryForm({ category, onSubmit, onCancel }: CategoryFormProps) {
  const [formData, setFormData] = useState<CategoryCreate>({
    name: category?.name || "",
    description: category?.description || "",
    color: category?.color || "#3B82F6", // Default blue color
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const predefinedColors = [
    "#3B82F6", // Blue
    "#10B981", // Green
    "#F59E0B", // Yellow
    "#EF4444", // Red
    "#8B5CF6", // Purple
    "#EC4899", // Pink
    "#06B6D4", // Cyan
    "#84CC16", // Lime
    "#F97316", // Orange
    "#6366F1", // Indigo
  ];

  return (
    <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {category ? "Edit Category" : "Create New Category"}
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
            placeholder="e.g., Health, Finance, Work"
          />
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
            placeholder="Describe what this category represents..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Color (Optional)
          </label>
          <div className="flex items-center space-x-2 mb-2">
            <input
              type="color"
              value={formData.color || "#3B82F6"}
              onChange={(e) =>
                setFormData({ ...formData, color: e.target.value })
              }
              className="w-8 h-8 rounded border border-gray-300"
            />
            <input
              type="text"
              value={formData.color || ""}
              onChange={(e) =>
                setFormData({ ...formData, color: e.target.value })
              }
              className="input flex-1 font-mono text-sm"
              placeholder="#3B82F6"
            />
          </div>
          <div className="grid grid-cols-5 gap-2">
            {predefinedColors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setFormData({ ...formData, color })}
                className={`w-8 h-8 rounded border-2 ${
                  formData.color === color
                    ? "border-gray-800"
                    : "border-gray-300"
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
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
            {category ? "Update" : "Create"} Category
          </button>
        </div>
      </form>
    </div>
  );
}
