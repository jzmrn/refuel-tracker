import axios from "axios";

function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return ""; // Fallback for server-side rendering
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

export interface DataPointCreate {
  timestamp: string;
  value: number;
  label: string;
  notes?: string;
}

export interface DataPointResponse {
  id: string;
  timestamp: string;
  value: number;
  label: string;
  notes?: string;
}

export interface DataSummaryResponse {
  total_entries: number;
  unique_labels: number;
  date_range: {
    earliest: string | null;
    latest: string | null;
  };
  value_stats: {
    min: number | null;
    max: number | null;
    average: number | null;
  };
}

export interface TimeSpanCreate {
  start_date: string;
  end_date?: string | null;
  label: string;
  group: string;
  notes?: string | null;
}

export interface TimeSpanUpdate {
  start_date?: string;
  end_date?: string | null;
  label?: string;
  group?: string | null;
  notes?: string | null;
}

export interface TimeSpanResponse {
  id: string;
  start_date: string;
  end_date?: string | null;
  label: string;
  group: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  duration_days?: number;
  duration_hours?: number;
  duration_minutes?: number;
}

export interface TimeSpanSummaryResponse {
  total_entries: number;
  unique_labels: number;
  completed_entries: number;
  ongoing_entries: number;
  date_range: {
    earliest: string | null;
    latest: string | null;
  };
  duration_stats: {
    total_minutes: number | null;
    average_minutes: number | null;
    min_minutes: number | null;
    max_minutes: number | null;
  };
}

// Fuel Prices interfaces
export interface GasStationSearchRequest {
  lat: number;
  lng: number;
  rad: number;
  fuel_type?: string;
  sort_by?: string;
}

export interface GasStationResponse {
  id: string;
  name: string;
  brand: string;
  street: string;
  house_number: string;
  post_code: number;
  place: string;
  lat: number;
  lng: number;
  dist?: number;
  price?: number;
  diesel?: number;
  e5?: number;
  e10?: number;
  is_open: boolean;
}

export interface FavoriteStationResponse {
  user_id: string;
  station_id: string;
  timestamp: string;
  name?: string;
  brand?: string;
  street?: string;
  house_number?: string;
  post_code?: number;
  place?: string;
  lat?: number;
  lng?: number;
  current_price_e5?: number;
  current_price_e10?: number;
  current_price_diesel?: number;
  is_open?: boolean;
}

export interface FuelPricesSummaryResponse {
  total_favorites: number;
  stations_open: number;
  lowest_e5_price?: number;
  lowest_e10_price?: number;
  lowest_diesel_price?: number;
  average_e5_price?: number;
  average_e10_price?: number;
  average_diesel_price?: number;
}

class ApiService {
  private api = axios.create({
    baseURL: getApiBaseUrl(),
    headers: {
      "Content-Type": "application/json",
    },
    withCredentials: true, // Important for session cookies
  });

  constructor() {}

  private categoriesCache: Category[] | null = null;

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

  // Data Points API
  async createDataPoint(
    dataPoint: DataPointCreate
  ): Promise<DataPointResponse> {
    const response = await this.api.post("/api/data-points", dataPoint);
    return response.data;
  }

  async getDataPoints(params?: {
    start_date?: string;
    end_date?: string;
    label?: string;
    limit?: number;
  }): Promise<DataPointResponse[]> {
    const response = await this.api.get("/api/data-points", { params });
    return response.data;
  }

  async deleteDataPoint(id: string): Promise<void> {
    await this.api.delete(`/api/data-points/${id}`);
  }

  async getExistingLabels(): Promise<string[]> {
    const response = await this.api.get("/api/data-points/labels");
    return response.data;
  }

  async getDataSummary(): Promise<DataSummaryResponse> {
    const response = await this.api.get("/api/data-points/summary");
    return response.data;
  }

  // Time Spans API
  async createTimeSpan(timeSpan: TimeSpanCreate): Promise<TimeSpanResponse> {
    const response = await this.api.post("/api/time-spans", timeSpan);
    return response.data;
  }

  async getTimeSpans(params?: {
    start_date?: string;
    end_date?: string;
    label?: string;
    group?: string;
    limit?: number;
  }): Promise<TimeSpanResponse[]> {
    const response = await this.api.get("/api/time-spans", { params });
    return response.data;
  }

  async updateTimeSpan(
    id: string,
    update: TimeSpanUpdate
  ): Promise<TimeSpanResponse> {
    const response = await this.api.put(`/api/time-spans/${id}`, update);
    return response.data;
  }

  async deleteTimeSpan(id: string): Promise<void> {
    await this.api.delete(`/api/time-spans/${id}`);
  }

  async getExistingTimeSpanLabels(): Promise<string[]> {
    const response = await this.api.get("/api/time-spans/labels");
    return response.data;
  }

  async getExistingTimeSpanGroups(): Promise<string[]> {
    const response = await this.api.get("/api/time-spans/groups");
    return response.data;
  }

  async getTimeSpanSummary(): Promise<TimeSpanSummaryResponse> {
    const response = await this.api.get("/api/time-spans/summary");
    return response.data;
  }

  // Fuel Prices endpoints
  async searchGasStations(
    params: GasStationSearchRequest
  ): Promise<GasStationResponse[]> {
    const response = await this.api.post("/api/fuel-prices/search", params);
    return response.data;
  }

  async addFavoriteStation(stationId: string): Promise<void> {
    await this.api.post("/api/fuel-prices/favorites", {
      station_id: stationId,
    });
  }

  async getFavoriteStations(): Promise<FavoriteStationResponse[]> {
    const response = await this.api.get("/api/fuel-prices/favorites");
    return response.data;
  }

  async deleteFavoriteStation(stationId: string): Promise<void> {
    await this.api.delete(`/api/fuel-prices/favorites/${stationId}`);
  }

  async getFuelPricesSummary(): Promise<FuelPricesSummaryResponse> {
    const response = await this.api.get("/api/fuel-prices/summary");
    return response.data;
  }
}

export const apiService = new ApiService();
export default apiService;
