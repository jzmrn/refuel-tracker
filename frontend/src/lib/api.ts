import axios from "axios";

export function getApiBaseUrl(): string {
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
  car_id: string;
  price: number;
  amount: number;
  kilometers_since_last_refuel: number;
  estimated_fuel_consumption: number;
  notes?: string;
  station_id?: string;
  remaining_range_km?: number | null;
}

export interface RefuelMetricCreate {
  car_id: string;
  price: number;
  amount: number;
  kilometers_since_last_refuel: number;
  estimated_fuel_consumption: number;
  timestamp?: string;
  notes?: string;
  station_id?: string;
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

export interface FavoriteStationDropdown {
  station_id: string;
  brand: string;
  street: string;
  house_number: string;
  place: string;
}

export interface FavoriteStationsDropdownResponse {
  favorites: FavoriteStationDropdown[];
  closest: FavoriteStationDropdown | null;
}

// Car interfaces
export interface Car {
  id: string;
  owner_user_id: string;
  owner_name?: string;
  name: string;
  year: number;
  fuel_tank_size: number;
  fuel_type?: string;
  created_at: string;
  is_owner: boolean;
  shared_by?: string;
  shared_users: CarAccessUser[];
  refuel_count: number;
}

export interface CarCreate {
  name: string;
  year: number;
  fuel_tank_size: number;
  fuel_type: string;
  shared_user_ids?: string[];
}

export interface CarUpdate {
  name?: string;
  year?: number;
  fuel_tank_size?: number;
  fuel_type?: string;
  shared_user_ids?: string[];
}

export interface CarAccessUser {
  user_id: string;
  user_name: string;
  user_email: string;
  granted_at: string;
  granted_by_user_id: string;
}

export interface UserSearchResult {
  id: string;
  name: string;
  email: string;
}

export interface CarStatistics {
  car_id: string;
  total_refuels: number;
  total_distance: number;
  total_fuel: number;
  total_cost: number;
  average_consumption: number;
  average_price_per_liter: number;
  first_refuel?: string;
  last_refuel?: string;
}

// Kilometer Entry interfaces
export interface KilometerEntry {
  id: string;
  car_id: string;
  total_kilometers: number;
  timestamp: string;
  created_at: string;
  created_by: string;
}

export interface KilometerEntryCreate {
  car_id: string;
  total_kilometers: number;
  timestamp?: string;
}

export interface KilometerPeriodAggregate {
  period_start: string;
  kilometers_driven: number;
}

export interface KilometerEntriesResponse {
  entries: KilometerEntry[];
  aggregates: KilometerPeriodAggregate[] | null;
}

// Fuel Prices interfaces
export interface GasStationSearchRequest {
  lat: number;
  lng: number;
  rad: number;
  fuel_type?: string;
  sort_by?: string;
  open_only?: boolean;
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
  diesel?: number;
  e5?: number;
  e10?: number;
  is_open: boolean;
}

export interface FuelPrice {
  value?: number;
  timestamp?: string;
}

export interface FuelPrices {
  e5: FuelPrice;
  e10: FuelPrice;
  diesel: FuelPrice;
}

export interface FavoriteStation {
  user_id: string;
  station_id: string;
  name?: string;
  brand?: string;
  street?: string;
  house_number?: string;
  post_code?: number;
  place?: string;
  lat?: number;
  lng?: number;
  prices: FuelPrices;
  is_open?: boolean;
  updated_at?: string;
}

export interface FavoriteStationsResponse {
  generated_at: string;
  stations: FavoriteStation[];
}

export interface PriceHistoryPoint {
  timestamp: string;
  price_e5?: number;
  price_e10?: number;
  price_diesel?: number;
}

export interface SingleFuelPriceHistoryPoint {
  timestamp: string;
  price?: number;
}

export interface StationMetaResponse {
  station_id: string;
  name?: string;
  brand?: string;
  street?: string;
  house_number?: string;
  post_code?: number;
  place?: string;
  lat?: number;
  lng?: number;
  generated_at: string;
  prices: FuelPrices;
  is_open?: boolean;
}

export interface StationPriceHistoryResponse {
  station_id: string;
  fuel_type: string;
  price_history: SingleFuelPriceHistoryPoint[];
}

export interface DailyStatsPoint {
  date: string;
  n_samples: number;
  n_price_changes: number;
  n_unique_prices: number;
  price_mean: number;
  price_min: number;
  price_max: number;
}

export interface StationDailyStatsResponse {
  station_id: string;
  fuel_type: string;
  daily_stats: DailyStatsPoint[];
}

export type FuelType = "e5" | "e10" | "diesel";

// Statistics types
export interface AvailableMonth {
  date: string;
}

export interface MonthlyBrandAggregate {
  brand: string;
  price_mean: number;
  price_min: number;
  price_max: number;
  n_stations: number;
  n_price_changes: number;
}

export interface MonthlyPlaceAggregate {
  place: string;
  post_code: number;
  price_mean: number;
  price_min: number;
  price_max: number;
  n_stations: number;
}

export interface PlaceDetailAggregate {
  date: string;
  place: string;
  post_code: number;
  price_mean: number;
  price_min: number;
  price_max: number;
  price_std: number | null;
  n_stations: number;
  n_price_changes: number;
  n_unique_prices: number;
  n_days: number;
  price_changes_per_station_day: number;
  unique_prices_per_station_day: number;
}

export interface BrandDetailAggregate {
  date: string;
  brand: string;
  price_mean: number;
  price_min: number;
  price_max: number;
  price_std: number | null;
  n_stations: number;
  n_price_changes: number;
  n_unique_prices: number;
  n_days: number;
  price_changes_per_station_day: number;
  unique_prices_per_station_day: number;
}

export interface MonthlyStationAggregate {
  station_id: string;
  station_name: string | null;
  brand: string | null;
  street: string | null;
  house_number: string | null;
  place: string | null;
  price_mean: number;
  price_min: number;
  price_max: number;
  n_price_changes: number;
}

export interface StationDetailAggregate {
  date: string;
  station_id: string;
  station_name: string | null;
  brand: string | null;
  place: string | null;
  price_mean: number;
  price_min: number;
  price_max: number;
  price_std: number | null;
  n_stations: number;
  n_price_changes: number;
  n_unique_prices: number;
  n_days: number;
  price_changes_per_station_day: number;
  unique_prices_per_station_day: number;
}

/**
 * Time range options for price history
 */
export enum PriceHistoryTimeRange {
  OneDay = "1d",
  OneWeek = "1w",
}

/**
 * Get the number of hours for a given time range
 */
export function getTimeRangeHours(timeRange: PriceHistoryTimeRange): number {
  switch (timeRange) {
    case PriceHistoryTimeRange.OneDay:
      return 24;
    case PriceHistoryTimeRange.OneWeek:
      return 168; // 7 * 24
    default:
      return 24;
  }
}

/**
 * Time range options for daily stats
 */
export enum DailyStatsTimeRange {
  OneWeek = "1w",
  OneMonth = "1m",
}

/**
 * Get the number of days for a given daily stats time range
 */
export function getDailyStatsRangeDays(timeRange: DailyStatsTimeRange): number {
  switch (timeRange) {
    case DailyStatsTimeRange.OneWeek:
      return 7;
    case DailyStatsTimeRange.OneMonth:
      return 30;
    default:
      return 7;
  }
}

export interface StationDetailsResponse {
  station_id: string;
  name?: string;
  brand?: string;
  street?: string;
  house_number?: string;
  post_code?: number;
  place?: string;
  lat?: number;
  lng?: number;
  generated_at: string;
  prices: FuelPrices;
  is_open?: boolean;
  price_history_24h?: PriceHistoryPoint[];
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
    definition: MetricDefinitionCreate,
  ): Promise<MetricDefinition> {
    const response = await this.api.post(
      "/api/metric-definitions/",
      definition,
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
    update: MetricDefinitionUpdate,
  ): Promise<MetricDefinition> {
    const response = await this.api.put(
      `/api/metric-definitions/${id}`,
      update,
    );
    return response.data;
  }

  async deleteMetricDefinition(id: string): Promise<void> {
    await this.api.delete(`/api/metric-definitions/${id}`);
  }

  async getMetricDefinitionCategories(): Promise<string[]> {
    const response = await this.api.get(
      "/api/metric-definitions/categories/list",
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
    limit?: number,
  ): Promise<Metric[]> {
    const params = limit ? { limit } : undefined;
    const response = await this.api.get(
      `/api/metrics/by-definition/${definitionId}`,
      { params },
    );
    return response.data;
  }

  async deleteMetric(
    timestamp: string,
    metricId: string,
    data: Record<string, string | number | boolean>,
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
    category: Partial<CategoryCreate>,
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
    definitions: MetricDefinition[],
  ): Promise<MetricDefinition[]> {
    await this.ensureCategoriesCache();
    return definitions.map((def) => ({
      ...def,
      category_name: this.categoriesCache?.find(
        (cat) => cat.id === def.category_id,
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
    car_id?: string;
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
    car_id?: string;
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
    month: number,
  ): Promise<RefuelMonthlySummary> {
    const response = await this.api.get(
      `/api/metrics/refuel/monthly/${year}/${month}`,
    );
    return response.data;
  }

  async getFavoriteStationsForDropdown(position?: {
    lat: number;
    lng: number;
  }): Promise<FavoriteStationsDropdownResponse> {
    const params = position
      ? { lat: position.lat, lng: position.lng }
      : undefined;
    const response = await this.api.get(
      "/api/metrics/refuel/favorite-stations",
      { params },
    );
    return response.data;
  }

  // Fuel Prices endpoints
  async searchGasStations(
    params: GasStationSearchRequest,
  ): Promise<GasStationResponse[]> {
    const response = await this.api.post("/api/fuel-prices/search", params);
    return response.data;
  }

  async addFavoriteStation(stationId: string): Promise<void> {
    await this.api.post("/api/fuel-prices/favorites", {
      station_id: stationId,
    });
  }

  async getFavoriteStations(): Promise<FavoriteStationsResponse> {
    const response = await this.api.get("/api/fuel-prices/favorites");
    return response.data;
  }

  async deleteFavoriteStation(stationId: string): Promise<void> {
    await this.api.delete(`/api/fuel-prices/favorites/${stationId}`);
  }

  async getStationDetails(stationId: string): Promise<StationDetailsResponse> {
    const response = await this.api.get(
      `/api/fuel-prices/stations/${stationId}`,
    );
    return response.data;
  }

  async getStationMeta(stationId: string): Promise<StationMetaResponse> {
    const response = await this.api.get(
      `/api/fuel-prices/stations/${stationId}`,
    );
    return response.data;
  }

  async getStationPriceHistory(
    stationId: string,
    fuelType: FuelType,
    hours: number = 24,
  ): Promise<StationPriceHistoryResponse> {
    const response = await this.api.get(
      `/api/fuel-prices/stations/${stationId}/price-history/${fuelType}`,
      { params: { hours } },
    );
    return response.data;
  }

  async getStationDailyStats(
    stationId: string,
    fuelType: FuelType,
    days: number = 7,
  ): Promise<StationDailyStatsResponse> {
    const response = await this.api.get(
      `/api/fuel-prices/stations/${stationId}/daily-stats/${fuelType}`,
      { params: { days } },
    );
    return response.data;
  }

  // Car Management endpoints
  async createCar(car: CarCreate): Promise<Car> {
    const response = await this.api.post("/api/cars", car);
    return response.data;
  }

  async getCars(): Promise<Car[]> {
    const response = await this.api.get("/api/cars");
    return response.data;
  }

  async getCar(carId: string): Promise<Car> {
    const response = await this.api.get(`/api/cars/${carId}`);
    return response.data;
  }

  async updateCar(carId: string, update: CarUpdate): Promise<Car> {
    const response = await this.api.patch(`/api/cars/${carId}`, update);
    return response.data;
  }

  async deleteCar(carId: string): Promise<void> {
    await this.api.delete(`/api/cars/${carId}`);
  }

  async shareCar(carId: string, userId: string): Promise<void> {
    await this.api.post(`/api/cars/${carId}/share`, { user_id: userId });
  }

  async revokeCarAccess(carId: string, userId: string): Promise<void> {
    await this.api.delete(`/api/cars/${carId}/share/${userId}`);
  }

  async getCarSharedUsers(carId: string): Promise<CarAccessUser[]> {
    const response = await this.api.get(`/api/cars/${carId}/shared-users`);
    return response.data;
  }

  async searchUsers(query: string): Promise<UserSearchResult[]> {
    const response = await this.api.get("/api/users/search", {
      params: { q: query },
    });
    return response.data;
  }

  async getCarStatistics(carId: string): Promise<CarStatistics> {
    const response = await this.api.get(`/api/cars/${carId}/statistics`);
    return response.data;
  }

  // Kilometer Entries endpoints
  async createKilometerEntry(
    entry: KilometerEntryCreate,
  ): Promise<KilometerEntry> {
    const response = await this.api.post("/api/kilometers", entry);
    return response.data;
  }

  async getKilometerEntries(params: {
    car_id: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    aggregation?: string;
  }): Promise<KilometerEntriesResponse> {
    const response = await this.api.get("/api/kilometers", { params });
    return response.data;
  }

  async deleteKilometerEntry(entryId: string, carId: string): Promise<void> {
    await this.api.delete(`/api/kilometers/${entryId}`, {
      params: { car_id: carId },
    });
  }

  // Statistics endpoints
  async getAvailableMonths(): Promise<AvailableMonth[]> {
    const response = await this.api.get("/api/stats/available-months");
    return response.data;
  }

  async getMonthlyBrandAggregates(
    fuelType: FuelType,
    date: string,
    limit: number = 10,
  ): Promise<MonthlyBrandAggregate[]> {
    const response = await this.api.get(`/api/stats/brands/${fuelType}`, {
      params: { date, limit },
    });
    return response.data;
  }

  async getMonthlyPlaceAggregates(
    fuelType: FuelType,
    date: string,
    limit: number = 10,
  ): Promise<MonthlyPlaceAggregate[]> {
    const response = await this.api.get(`/api/stats/places/${fuelType}`, {
      params: { date, limit },
    });
    return response.data;
  }

  async getMonthlyStationAggregates(
    fuelType: FuelType,
    date: string,
    limit: number = 10,
  ): Promise<MonthlyStationAggregate[]> {
    const response = await this.api.get(`/api/stats/stations/${fuelType}`, {
      params: { date, limit },
    });
    return response.data;
  }

  async getPlaceDetails(
    fuelType: FuelType,
    months: number = 3,
    limit: number = 10,
  ): Promise<PlaceDetailAggregate[]> {
    const response = await this.api.get(
      `/api/stats/places/${fuelType}/details`,
      {
        params: { months, limit },
      },
    );
    return response.data;
  }

  async getBrandDetails(
    fuelType: FuelType,
    months: number = 3,
    limit: number = 10,
  ): Promise<BrandDetailAggregate[]> {
    const response = await this.api.get(
      `/api/stats/brands/${fuelType}/details`,
      {
        params: { months, limit },
      },
    );
    return response.data;
  }

  async getStationDetailAggregates(
    fuelType: FuelType,
    months: number = 3,
    limit: number = 10,
  ): Promise<StationDetailAggregate[]> {
    const response = await this.api.get(
      `/api/stats/stations/${fuelType}/details`,
      {
        params: { months, limit },
      },
    );
    return response.data;
  }
}

export const apiService = new ApiService();
export default apiService;
