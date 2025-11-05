import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import TransactionList from "@/components/transactions/TransactionList";
import AddTransactionForm from "@/components/transactions/AddTransactionForm";
import apiService, { MonthlySummary } from "@/lib/api";

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMonthlySummary();
  }, [refreshTrigger]);

  const fetchMonthlySummary = async () => {
    try {
      setLoading(true);
      const now = new Date();
      const summary = await apiService.getMonthlySummary(
        now.getFullYear(),
        now.getMonth() + 1,
      );
      setMonthlySummary(summary);
    } catch (error) {
      console.error("Error fetching monthly summary:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTransactionAdded = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Financial Dashboard
        </h1>
        <p className="text-gray-600 mt-2">
          Track your financial data with ease
        </p>
      </div>

      {/* Monthly Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                <span className="text-green-600 font-semibold">+</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Income</p>
              <p className="text-2xl font-semibold text-gray-900">
                {loading ? "..." : formatCurrency(monthlySummary?.income || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 rounded-md flex items-center justify-center">
                <span className="text-red-600 font-semibold">-</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Expenses</p>
              <p className="text-2xl font-semibold text-gray-900">
                {loading
                  ? "..."
                  : formatCurrency(monthlySummary?.expenses || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div
                className={`w-8 h-8 rounded-md flex items-center justify-center ${
                  (monthlySummary?.net || 0) >= 0
                    ? "bg-green-100"
                    : "bg-red-100"
                }`}
              >
                <span
                  className={`font-semibold ${
                    (monthlySummary?.net || 0) >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {(monthlySummary?.net || 0) >= 0 ? "=" : "="}
                </span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Net</p>
              <p
                className={`text-2xl font-semibold ${
                  (monthlySummary?.net || 0) >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {loading ? "..." : formatCurrency(monthlySummary?.net || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                <span className="text-blue-600 font-semibold">#</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Transactions</p>
              <p className="text-2xl font-semibold text-gray-900">
                {loading ? "..." : monthlySummary?.transaction_count || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Add Transaction Form */}
        <div>
          <AddTransactionForm onTransactionAdded={handleTransactionAdded} />
        </div>

        {/* Transaction List */}
        <div>
          <TransactionList refreshTrigger={refreshTrigger} />
        </div>
      </div>
    </div>
  );
}
