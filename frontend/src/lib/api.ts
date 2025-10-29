import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Transaction {
  timestamp: string;
  account_id: string;
  amount: number;
  category: string;
  description?: string;
  transaction_type: "income" | "expense" | "transfer";
}

export interface TransactionCreate {
  account_id: string;
  amount: number;
  category: string;
  description?: string;
  transaction_type: "income" | "expense" | "transfer";
}

export interface MonthlySummary {
  income: number;
  expenses: number;
  net: number;
  transaction_count: number;
}

export interface SpendingByCategory {
  category: string;
  total_spent: number;
  transaction_count: number;
  avg_amount: number;
}

export interface MetricFieldDefinition {
  name: string;
  type: "text" | "number" | "boolean";
  required: boolean;
  default_value?: string | number | boolean;
  description?: string;
}

export interface MetricDefinition {
  id: string;
  title: string;
  description?: string;
  category: string;
  unit?: string;
  fields: MetricFieldDefinition[];
  created_at: string;
  updated_at: string;
}

export interface MetricDefinitionCreate {
  title: string;
  description?: string;
  category: string;
  unit?: string;
  fields: MetricFieldDefinition[];
}

export interface MetricDefinitionUpdate {
  title?: string;
  description?: string;
  category?: string;
  unit?: string;
  fields?: MetricFieldDefinition[];
}

export interface Metric {
  timestamp: string;
  metric_id: string;
  data: Record<string, string | number | boolean>;
  notes?: string;
}

export interface MetricCreate {
  metric_id: string;
  data: Record<string, string | number | boolean>;
  notes?: string;
}

export interface MetricSummary {
  total_metrics: number;
  categories: number;
  recent_count: number;
  most_recent_date?: string;
}

class ApiService {
  private api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      "Content-Type": "application/json",
    },
  });

  // Transactions
  async addTransaction(transaction: TransactionCreate): Promise<void> {
    await this.api.post("/transactions/", transaction);
  }

  async getTransactions(params?: {
    start_date?: string;
    end_date?: string;
    account_id?: string;
    category?: string;
    limit?: number;
  }): Promise<Transaction[]> {
    const response = await this.api.get("/transactions/", { params });
    return response.data;
  }

  async addTransactionsBulk(transactions: TransactionCreate[]): Promise<void> {
    await this.api.post("/transactions/bulk", transactions);
  }

  // Analytics
  async getSpendingByCategory(
    startDate: string,
    endDate: string
  ): Promise<SpendingByCategory[]> {
    const response = await this.api.get("/analytics/spending-by-category", {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data;
  }

  async getMonthlySummary(
    year: number,
    month: number
  ): Promise<MonthlySummary> {
    const response = await this.api.get(
      `/analytics/monthly-summary/${year}/${month}`
    );
    return response.data;
  }

  async getAccountBalanceHistory(
    accountId: string,
    days: number = 30
  ): Promise<any[]> {
    const response = await this.api.get(
      `/analytics/account-balance-history/${accountId}`,
      {
        params: { days },
      }
    );
    return response.data;
  }

  // Health check
  async healthCheck(): Promise<any> {
    const response = await this.api.get("/health");
    return response.data;
  }

  // Metric Definitions
  async createMetricDefinition(
    definition: MetricDefinitionCreate
  ): Promise<MetricDefinition> {
    const response = await this.api.post(
      "/api/metric-definitions/",
      definition
    );
    return response.data;
  }

  async getMetricDefinitions(category?: string): Promise<MetricDefinition[]> {
    const params = category ? { category } : undefined;
    const response = await this.api.get("/api/metric-definitions/", { params });
    return response.data;
  }

  async getMetricDefinition(id: string): Promise<MetricDefinition> {
    const response = await this.api.get(`/api/metric-definitions/${id}`);
    return response.data;
  }

  async updateMetricDefinition(
    id: string,
    update: MetricDefinitionUpdate
  ): Promise<MetricDefinition> {
    const response = await this.api.put(
      `/api/metric-definitions/${id}`,
      update
    );
    return response.data;
  }

  async deleteMetricDefinition(id: string): Promise<void> {
    await this.api.delete(`/api/metric-definitions/${id}`);
  }

  async getMetricDefinitionCategories(): Promise<string[]> {
    const response = await this.api.get(
      "/api/metric-definitions/categories/list"
    );
    return response.data;
  }

  // Metric Values
  async addMetric(metric: MetricCreate): Promise<any> {
    const response = await this.api.post("/api/metrics/", metric);
    return response.data;
  }

  async getMetrics(params?: {
    start_date?: string;
    end_date?: string;
    category?: string;
    metric_id?: string;
    limit?: number;
  }): Promise<Metric[]> {
    const response = await this.api.get("/api/metrics/", { params });
    return response.data;
  }

  async getMetricsByDefinition(
    definitionId: string,
    limit?: number
  ): Promise<Metric[]> {
    const params = limit ? { limit } : undefined;
    const response = await this.api.get(
      `/api/metrics/by-definition/${definitionId}`,
      { params }
    );
    return response.data;
  }

  async getMetricsSummary(): Promise<MetricSummary> {
    const response = await this.api.get("/api/metrics/summary");
    return response.data;
  }

  // Backup
  async createBackup(): Promise<any> {
    const response = await this.api.post("/backup");
    return response.data;
  }
}

export const apiService = new ApiService();
export default apiService;
