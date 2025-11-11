import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import TransactionList from "@/components/transactions/TransactionList";
import AddTransactionForm from "@/components/transactions/AddTransactionForm";
import FloatingActionButton from "@/components/common/FloatingActionButton";
import SummaryCard from "@/components/common/SummaryCard";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import apiService, { MonthlySummary } from "@/lib/api";

export default function Home() {
  const { t } = useTranslation();
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

  return (
    <div>
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
          {t.navigation.dashboard}
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2 text-sm md:text-base">
          {t.dashboard.welcome}
        </p>
      </div>

      {/* Monthly Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        <SummaryCard
          title={t.transactions.income}
          value={{ value: monthlySummary?.income || 0, unit: "€" }}
          icon={<span className="font-semibold text-sm md:text-base">+</span>}
          iconBgColor="green"
          loading={loading}
        />

        <SummaryCard
          title={t.transactions.expenses}
          value={{ value: monthlySummary?.expenses || 0, unit: "€" }}
          icon={<span className="font-semibold text-sm md:text-base">-</span>}
          iconBgColor="red"
          loading={loading}
        />

        <SummaryCard
          title={t.transactions.net}
          value={{ value: monthlySummary?.net || 0, unit: "€" }}
          icon={<span className="font-semibold text-sm md:text-base">=</span>}
          iconBgColor={(monthlySummary?.net || 0) >= 0 ? "green" : "red"}
          loading={loading}
        />

        <SummaryCard
          title={t.transactions.transactions}
          value={{ value: (monthlySummary?.transaction_count || 0).toString() }}
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
