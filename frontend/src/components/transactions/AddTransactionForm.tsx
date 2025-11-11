import { useState } from "react";
import apiService, { TransactionCreate } from "@/lib/api";
import { StandardForm } from "../common/StandardForm";
import { useTranslation } from "@/lib/i18n/LanguageContext";

interface AddTransactionFormProps {
  onTransactionAdded: () => void;
}

export default function AddTransactionForm({
  onTransactionAdded,
}: AddTransactionFormProps) {
  const { t } = useTranslation();
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
      setError(t.transactions.failedToAdd);
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
    <StandardForm
      title={t.transactions.addTransaction}
      onSubmit={handleSubmit}
      actions={
        <button
          type="submit"
          disabled={loading}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? t.transactions.adding : t.transactions.addTransaction}
        </button>
      }
    >
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="transaction_type" className="label-compact">
            {t.transactions.type}
          </label>
          <select
            id="transaction_type"
            name="transaction_type"
            value={formData.transaction_type}
            onChange={handleInputChange}
            className="input"
            required
          >
            <option value="income">{t.transactions.income}</option>
            <option value="expense">{t.transactions.expense}</option>
            <option value="transfer">{t.transactions.transfer}</option>
          </select>
        </div>

        <div>
          <label htmlFor="amount" className="label-compact">
            {t.transactions.amount}
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
          <label htmlFor="account_id" className="label-compact">
            {t.transactions.account}
          </label>
          <input
            type="text"
            id="account_id"
            name="account_id"
            value={formData.account_id}
            onChange={handleInputChange}
            placeholder={t.transactions.placeholders.account}
            className="input"
            required
          />
        </div>

        <div>
          <label htmlFor="category" className="label-compact">
            {t.transactions.category}
          </label>
          <input
            type="text"
            id="category"
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            placeholder={t.transactions.placeholders.category}
            className="input"
            required
          />
        </div>
      </div>

      <div>
        <label htmlFor="description" className="label-compact">
          {t.transactions.descriptionOptional}
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          rows={2}
          className="input"
          placeholder={t.transactions.placeholders.description}
        />
      </div>
    </StandardForm>
  );
}
