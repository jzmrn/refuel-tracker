import { useState } from "react";
import apiService, { TransactionCreate } from "@/lib/api";

interface AddTransactionFormProps {
  onTransactionAdded: () => void;
}

export default function AddTransactionForm({
  onTransactionAdded,
}: AddTransactionFormProps) {
  const [formData, setFormData] = useState<TransactionCreate>({
    account_id: "",
    amount: 0,
    category: "",
    description: "",
    transaction_type: "expense",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiService.addTransaction(formData);

      // Reset form
      setFormData({
        account_id: "",
        amount: 0,
        category: "",
        description: "",
        transaction_type: "expense",
      });

      onTransactionAdded();
    } catch (err) {
      setError("Failed to add transaction");
      console.error("Error adding transaction:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "amount" ? parseFloat(value) || 0 : value,
    }));
  };

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
        Add Transaction
      </h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="transaction_type"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Type
            </label>
            <select
              id="transaction_type"
              name="transaction_type"
              value={formData.transaction_type}
              onChange={handleInputChange}
              className="input"
              required
            >
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="amount"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Amount
            </label>
            <input
              type="number"
              id="amount"
              name="amount"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={handleInputChange}
              className="input"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="account_id"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Account
            </label>
            <input
              type="text"
              id="account_id"
              name="account_id"
              value={formData.account_id}
              onChange={handleInputChange}
              placeholder="e.g., checking, savings"
              className="input"
              required
            />
          </div>

          <div>
            <label
              htmlFor="category"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Category
            </label>
            <input
              type="text"
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              placeholder="e.g., groceries, salary"
              className="input"
              required
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Description (optional)
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={2}
            className="input"
            placeholder="Additional details..."
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Adding..." : "Add Transaction"}
          </button>
        </div>
      </form>
    </div>
  );
}
