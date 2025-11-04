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

export interface Unit {
  id: string;
  name: string;
  symbol: string;
  type: "text" | "number" | "boolean";
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface UnitCreate {
  name: string;
  symbol: string;
  type: "text" | "number" | "boolean";
  description?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  created_at: string;
  updated_at: string;
}

export interface CategoryCreate {
  name: string;
  description?: string;
  color?: string;
}

export interface MetricFieldDefinition {
  name: string;
  unit_id: string;
  required: boolean;
  default_value?: string | number | boolean;
  description?: string;
}

export interface MetricDefinition {
  id: string;
  title: string;
  description?: string;
  category_id: string;
  category_name?: string; // Populated by frontend from category lookup
  fields: MetricFieldDefinition[];
  created_at: string;
  updated_at: string;
}

export interface MetricDefinitionCreate {
  title: string;
  description?: string;
  category_id: string;
  fields: MetricFieldDefinition[];
}

export interface MetricDefinitionUpdate {
  title?: string;
  description?: string;
  category_id?: string;
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

export interface RefuelMetric {
  timestamp: string;
  price: number;
  amount: number;
  kilometers_since_last_refuel: number;
  estimated_fuel_consumption: number;
  notes?: string;
}

export interface RefuelMetricCreate {
  price: number;
  amount: number;
  kilometers_since_last_refuel: number;
  estimated_fuel_consumption: number;
  timestamp?: string;
  notes?: string;
}

export interface RefuelStatistics {
  cost_statistics: {
    total_cost: number;
    total_liters: number;
    average_price_per_liter: number;
    fill_up_count: number;
  };
  price_trends: Array<{
    date: string;
    timestamp: string;
    price: number;
    amount: number;
    total_cost: number;
  }>;
}

export interface RefuelMonthlySummary {
  total_cost: number;
  total_liters: number;
  average_price_per_liter: number;
  fill_up_count: number;
  max_price: number;
  min_price: number;
  largest_fillup: number;
  smallest_fillup: number;
}

class ApiService {
  private api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      "Content-Type": "application/json",
    },
  });

  private categoriesCache: Category[] | null = null;

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
    return await this.populateCategoryNames(response.data);
  }

  async getMetricDefinition(id: string): Promise<MetricDefinition> {
    const response = await this.api.get(`/api/metric-definitions/${id}`);
    const definitions = await this.populateCategoryNames([response.data]);
    return definitions[0];
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

  async deleteMetric(
    timestamp: string,
    metricId: string,
    data: Record<string, string | number | boolean>
  ): Promise<void> {
    await this.api.delete("/api/metrics/", {
      params: {
        timestamp,
        metric_id: metricId,
        data: JSON.stringify(data),
      },
    });
  }

  async getMetricsSummary(): Promise<MetricSummary> {
    const response = await this.api.get("/api/metrics/summary");
    return response.data;
  }

  // Units
  async getUnits(): Promise<Unit[]> {
    const response = await this.api.get("/api/units");
    return response.data;
  }

  async createUnit(unit: UnitCreate): Promise<Unit> {
    const response = await this.api.post("/api/units", unit);
    return response.data;
  }

  async getUnit(id: string): Promise<Unit> {
    const response = await this.api.get(`/api/units/${id}`);
    return response.data;
  }

  async updateUnit(id: string, unit: Partial<UnitCreate>): Promise<Unit> {
    const response = await this.api.put(`/api/units/${id}`, unit);
    return response.data;
  }

  async deleteUnit(id: string): Promise<void> {
    await this.api.delete(`/api/units/${id}`);
  }

  async initializeDefaultUnits(): Promise<any> {
    const response = await this.api.post("/api/units/initialize-defaults");
    return response.data;
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    const response = await this.api.get("/api/categories");
    return response.data;
  }

  async createCategory(category: CategoryCreate): Promise<Category> {
    const response = await this.api.post("/api/categories", category);
    this.categoriesCache = null; // Invalidate cache
    return response.data;
  }

  async getCategory(id: string): Promise<Category> {
    const response = await this.api.get(`/api/categories/${id}`);
    return response.data;
  }

  async updateCategory(
    id: string,
    category: Partial<CategoryCreate>
  ): Promise<Category> {
    const response = await this.api.put(`/api/categories/${id}`, category);
    this.categoriesCache = null; // Invalidate cache
    return response.data;
  }

  async deleteCategory(id: string): Promise<void> {
    await this.api.delete(`/api/categories/${id}`);
    this.categoriesCache = null; // Invalidate cache
  }

  async initializeDefaultCategories(): Promise<any> {
    const response = await this.api.post("/api/categories/initialize-defaults");
    this.categoriesCache = null; // Invalidate cache
    return response.data;
  }

  // Helper methods for populating category names
  private async ensureCategoriesCache(): Promise<void> {
    if (!this.categoriesCache) {
      this.categoriesCache = await this.getCategories();
    }
  }

  private async populateCategoryNames(
    definitions: MetricDefinition[]
  ): Promise<MetricDefinition[]> {
    await this.ensureCategoriesCache();
    return definitions.map((def) => ({
      ...def,
      category_name: this.categoriesCache?.find(
        (cat) => cat.id === def.category_id
      )?.name,
    }));
  }

  // Backup
  async createBackup(): Promise<any> {
    const response = await this.api.post("/backup");
    return response.data;
  }

  async createRefuelMetric(metric: RefuelMetricCreate): Promise<any> {
    const response = await this.api.post("/api/metrics/refuel", metric);
    return response.data;
  }

  async getRefuelMetrics(params?: {
    start_date?: string;
    end_date?: string;
    limit?: number;
  }): Promise<RefuelMetric[]> {
    const response = await this.api.get("/api/metrics/refuel", {
      params,
    });
    return response.data;
  }

  async getRefuelStatistics(params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<RefuelStatistics> {
    const response = await this.api.get("/api/metrics/refuel/statistics", {
      params,
    });
    return response.data;
  }

  async getRefuelMonthlySummary(
    year: number,
    month: number
  ): Promise<RefuelMonthlySummary> {
    const response = await this.api.get(
      `/api/metrics/refuel/monthly/${year}/${month}`
    );
    return response.data;
  }
}

export const apiService = new ApiService();
export default apiService;
