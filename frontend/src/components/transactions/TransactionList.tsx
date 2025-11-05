import { useState, useEffect } from "react";
import { format } from "date-fns";
import apiService, { Transaction } from "@/lib/api";

interface TransactionListProps {
  refreshTrigger?: number;
}

export default function TransactionList({
  refreshTrigger,
}: TransactionListProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTransactions();
  }, [refreshTrigger]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const data = await apiService.getTransactions({ limit: 50 });
      setTransactions(data);
    } catch (err) {
      setError("Failed to fetch transactions");
      console.error("Error fetching transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Math.abs(amount));
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case "income":
        return "text-green-600";
      case "expense":
        return "text-red-600";
      case "transfer":
        return "text-blue-600";
      default:
        return "text-gray-600";
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={fetchTransactions} className="btn btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>

      {transactions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No transactions found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((transaction, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-medium text-gray-900">
                      {transaction.description || transaction.category}
                    </p>
                    <p className="text-sm text-gray-500">
                      {transaction.account_id} • {transaction.category}
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <p
                  className={`font-semibold ${getTransactionTypeColor(
                    transaction.transaction_type
                  )}`}
                >
                  {transaction.transaction_type === "expense" ? "-" : "+"}
                  {formatCurrency(transaction.amount)}
                </p>
                <p className="text-sm text-gray-500">
                  {format(new Date(transaction.timestamp), "MMM d, yyyy")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
