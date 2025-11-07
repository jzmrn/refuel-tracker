import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import TransactionList from "@/components/transactions/TransactionList";
import AddTransactionForm from "@/components/transactions/AddTransactionForm";
import FloatingActionButton from "@/components/common/FloatingActionButton";
import SummaryCard from "@/components/common/SummaryCard";
import apiService, { MonthlySummary } from "@/lib/api";

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [isMobileFormOpen, setIsMobileFormOpen] = useState(false);

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
    setIsMobileFormOpen(false);
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
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
          Financial Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2 text-sm md:text-base">
          Track your financial data with ease
        </p>
      </div>

      {/* Monthly Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        <SummaryCard
          title="Income"
          value={loading ? "..." : formatCurrency(monthlySummary?.income || 0)}
          icon={<span className="font-semibold text-sm md:text-base">+</span>}
          iconBgColor="green"
          loading={loading}
        />

        <SummaryCard
          title="Expenses"
          value={
            loading ? "..." : formatCurrency(monthlySummary?.expenses || 0)
          }
          icon={<span className="font-semibold text-sm md:text-base">-</span>}
          iconBgColor="red"
          loading={loading}
        />

        <SummaryCard
          title="Net"
          value={loading ? "..." : formatCurrency(monthlySummary?.net || 0)}
          icon={<span className="font-semibold text-sm md:text-base">=</span>}
          iconBgColor={(monthlySummary?.net || 0) >= 0 ? "green" : "red"}
          loading={loading}
        />

        <SummaryCard
          title="Transactions"
          value={
            loading
              ? "..."
              : (monthlySummary?.transaction_count || 0).toString()
          }
          icon={<span className="font-semibold text-sm md:text-base">#</span>}
          iconBgColor="blue"
          loading={loading}
        />
      </div>

      {/* Desktop Layout - Side by side */}
      <div className="hidden lg:grid lg:grid-cols-2 lg:gap-8">
        {/* Add Transaction Form */}
        <div>
          <AddTransactionForm onTransactionAdded={handleTransactionAdded} />
        </div>

        {/* Transaction List */}
        <div>
          <TransactionList refreshTrigger={refreshTrigger} />
        </div>
      </div>

      {/* Mobile Layout - Stacked */}
      <div className="lg:hidden space-y-6">
        {/* Transaction List */}
        <div>
          <TransactionList refreshTrigger={refreshTrigger} />
        </div>
      </div>

      {/* Floating Action Button for Mobile */}
      <FloatingActionButton
        onAddClick={() => setIsMobileFormOpen(true)}
        isOpen={isMobileFormOpen}
        onClose={() => setIsMobileFormOpen(false)}
      >
        <AddTransactionForm onTransactionAdded={handleTransactionAdded} />
      </FloatingActionButton>
    </div>
  );
}
