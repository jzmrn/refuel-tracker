import { useSuspenseQuery } from "@tanstack/react-query";
import apiService, { FuelType } from "@/lib/api";

const MIN_LOAD_TIME_MS = 500;

// Query Keys - centralized for consistency
export const statsKeys = {
  all: ["stats"] as const,
  availableMonths: () => [...statsKeys.all, "availableMonths"] as const,
  brands: (date: string, fuelType: FuelType, limit: number) =>
    [...statsKeys.all, "brands", date, fuelType, limit] as const,
  places: (date: string, fuelType: FuelType, limit: number) =>
    [...statsKeys.all, "places", date, fuelType, limit] as const,
  stations: (date: string, fuelType: FuelType, limit: number) =>
    [...statsKeys.all, "stations", date, fuelType, limit] as const,
  placeDetails: (fuelType: FuelType, months: number, limit: number) =>
    [...statsKeys.all, "placeDetails", fuelType, months, limit] as const,
  brandDetails: (fuelType: FuelType, months: number, limit: number) =>
    [...statsKeys.all, "brandDetails", fuelType, months, limit] as const,
  stationDetails: (fuelType: FuelType, months: number, limit: number) =>
    [...statsKeys.all, "stationDetails", fuelType, months, limit] as const,
  stationDailyPrices: (stationId: string, days: number) =>
    [...statsKeys.all, "stationDailyPrices", stationId, days] as const,
  stationComparison: (stationId: string, fuelType: FuelType, days: number) =>
    [...statsKeys.all, "stationComparison", stationId, fuelType, days] as const,
  stationDailyStats: (stationId: string, fuelType: FuelType, days: number) =>
    [...statsKeys.all, "stationDailyStats", stationId, fuelType, days] as const,
};

/**
 * Suspense-based hook to fetch available months for statistics.
 * Must be used inside a <Suspense> boundary.
 */
export function useAvailableMonths() {
  return useSuspenseQuery({
    queryKey: statsKeys.availableMonths(),
    queryFn: async () => {
      const promise = apiService.getAvailableMonths();
      const [data] = await Promise.all([
        promise,
        new Promise((r) => setTimeout(r, MIN_LOAD_TIME_MS)),
      ]);
      return data;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Suspense-based hook to fetch monthly brand aggregates for a given date and fuel type.
 * Must be used inside a <Suspense> boundary.
 */
export function useMonthlyBrandAggregates(
  date: string,
  fuelType: FuelType,
  limit: number = 10,
) {
  return useSuspenseQuery({
    queryKey: statsKeys.brands(date, fuelType, limit),
    queryFn: async () => {
      const promise = apiService.getMonthlyBrandAggregates(
        fuelType,
        date,
        limit,
      );
      const [data] = await Promise.all([
        promise,
        new Promise((r) => setTimeout(r, MIN_LOAD_TIME_MS)),
      ]);
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Suspense-based hook to fetch monthly place aggregates for a given date and fuel type.
 * Must be used inside a <Suspense> boundary.
 */
export function useMonthlyPlaceAggregates(
  date: string,
  fuelType: FuelType,
  limit: number = 10,
) {
  return useSuspenseQuery({
    queryKey: statsKeys.places(date, fuelType, limit),
    queryFn: async () => {
      const promise = apiService.getMonthlyPlaceAggregates(
        fuelType,
        date,
        limit,
      );
      const [data] = await Promise.all([
        promise,
        new Promise((r) => setTimeout(r, MIN_LOAD_TIME_MS)),
      ]);
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Suspense-based hook to fetch monthly station aggregates for a given date and fuel type.
 * Must be used inside a <Suspense> boundary.
 */
export function useMonthlyStationAggregates(
  date: string,
  fuelType: FuelType,
  limit: number = 10,
) {
  return useSuspenseQuery({
    queryKey: statsKeys.stations(date, fuelType, limit),
    queryFn: async () => {
      const promise = apiService.getMonthlyStationAggregates(
        fuelType,
        date,
        limit,
      );
      const [data] = await Promise.all([
        promise,
        new Promise((r) => setTimeout(r, MIN_LOAD_TIME_MS)),
      ]);
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Suspense-based hook to fetch multi-month place detail aggregates for the top N cheapest places.
 * Must be used inside a <Suspense> boundary.
 */
export function usePlaceDetails(
  fuelType: FuelType,
  months: number = 3,
  limit: number = 10,
) {
  return useSuspenseQuery({
    queryKey: statsKeys.placeDetails(fuelType, months, limit),
    queryFn: async () => {
      const promise = apiService.getPlaceDetails(fuelType, months, limit);
      const [data] = await Promise.all([
        promise,
        new Promise((r) => setTimeout(r, MIN_LOAD_TIME_MS)),
      ]);
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Suspense-based hook to fetch multi-month brand detail aggregates for the top N cheapest brands.
 * Must be used inside a <Suspense> boundary.
 */
export function useBrandDetails(
  fuelType: FuelType,
  months: number = 3,
  limit: number = 10,
) {
  return useSuspenseQuery({
    queryKey: statsKeys.brandDetails(fuelType, months, limit),
    queryFn: async () => {
      const promise = apiService.getBrandDetails(fuelType, months, limit);
      const [data] = await Promise.all([
        promise,
        new Promise((r) => setTimeout(r, MIN_LOAD_TIME_MS)),
      ]);
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Suspense-based hook to fetch multi-month station detail aggregates for the top N cheapest stations.
 * Must be used inside a <Suspense> boundary.
 */
export function useStationDetails(
  fuelType: FuelType,
  months: number = 3,
  limit: number = 10,
) {
  return useSuspenseQuery({
    queryKey: statsKeys.stationDetails(fuelType, months, limit),
    queryFn: async () => {
      const promise = apiService.getStationDetailAggregates(
        fuelType,
        months,
        limit,
      );
      const [data] = await Promise.all([
        promise,
        new Promise((r) => setTimeout(r, MIN_LOAD_TIME_MS)),
      ]);
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Suspense-based hook to fetch daily prices for all fuel types at a specific station.
 * Must be used inside a <Suspense> boundary.
 */
export function useStationDailyPrices(stationId: string, days: number = 90) {
  return useSuspenseQuery({
    queryKey: statsKeys.stationDailyPrices(stationId, days),
    queryFn: async () => {
      const promise = apiService.getStationDailyPrices(stationId, days);
      const [data] = await Promise.all([
        promise,
        new Promise((r) => setTimeout(r, MIN_LOAD_TIME_MS)),
      ]);
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Suspense-based hook to fetch daily price comparison (station vs place vs brand).
 * Must be used inside a <Suspense> boundary.
 */
export function useStationComparison(
  stationId: string,
  fuelType: FuelType,
  days: number = 90,
) {
  return useSuspenseQuery({
    queryKey: statsKeys.stationComparison(stationId, fuelType, days),
    queryFn: async () => {
      const promise = apiService.getStationComparison(
        stationId,
        fuelType,
        days,
      );
      const [data] = await Promise.all([
        promise,
        new Promise((r) => setTimeout(r, MIN_LOAD_TIME_MS)),
      ]);
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Suspense-based hook to fetch daily statistics for a specific station and fuel type.
 * Must be used inside a <Suspense> boundary.
 */
export function useStationDailyStatsByDays(
  stationId: string,
  fuelType: FuelType,
  days: number = 90,
) {
  return useSuspenseQuery({
    queryKey: statsKeys.stationDailyStats(stationId, fuelType, days),
    queryFn: async () => {
      const promise = apiService.getStationDailyStats(
        stationId,
        fuelType,
        days,
      );
      const [data] = await Promise.all([
        promise,
        new Promise((r) => setTimeout(r, MIN_LOAD_TIME_MS)),
      ]);
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });
}
