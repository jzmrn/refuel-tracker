import { useQuery } from "@tanstack/react-query";
import apiService, { FuelType } from "@/lib/api";
import { useWithMinLoadTime } from "./useWithMinLoadTime";

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
};

/**
 * Hook to fetch available months for statistics.
 * Data changes infrequently so use a longer stale time.
 */
export function useAvailableMonths() {
  return useQuery({
    queryKey: statsKeys.availableMonths(),
    queryFn: () => apiService.getAvailableMonths(),
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useAvailableMonthsWithMinLoadTime() {
  return useWithMinLoadTime(useAvailableMonths());
}

/**
 * Hook to fetch monthly brand aggregates for a given date and fuel type.
 */
export function useMonthlyBrandAggregates(
  date: string | null,
  fuelType: FuelType,
  limit: number = 10,
) {
  return useQuery({
    queryKey: statsKeys.brands(date || "", fuelType, limit),
    queryFn: () => apiService.getMonthlyBrandAggregates(fuelType, date!, limit),
    enabled: !!date,
    staleTime: 10 * 60 * 1000,
  });
}

export function useMonthlyBrandAggregatesWithMinLoadTime(
  date: string | null,
  fuelType: FuelType,
  limit: number = 10,
) {
  return useWithMinLoadTime(useMonthlyBrandAggregates(date, fuelType, limit));
}

/**
 * Hook to fetch monthly place aggregates for a given date and fuel type.
 */
export function useMonthlyPlaceAggregates(
  date: string | null,
  fuelType: FuelType,
  limit: number = 10,
) {
  return useQuery({
    queryKey: statsKeys.places(date || "", fuelType, limit),
    queryFn: () => apiService.getMonthlyPlaceAggregates(fuelType, date!, limit),
    enabled: !!date,
    staleTime: 10 * 60 * 1000,
  });
}

export function useMonthlyPlaceAggregatesWithMinLoadTime(
  date: string | null,
  fuelType: FuelType,
  limit: number = 10,
) {
  return useWithMinLoadTime(useMonthlyPlaceAggregates(date, fuelType, limit));
}

/**
 * Hook to fetch monthly station aggregates for a given date and fuel type.
 */
export function useMonthlyStationAggregates(
  date: string | null,
  fuelType: FuelType,
  limit: number = 10,
) {
  return useQuery({
    queryKey: statsKeys.stations(date || "", fuelType, limit),
    queryFn: () =>
      apiService.getMonthlyStationAggregates(fuelType, date!, limit),
    enabled: !!date,
    staleTime: 10 * 60 * 1000,
  });
}

export function useMonthlyStationAggregatesWithMinLoadTime(
  date: string | null,
  fuelType: FuelType,
  limit: number = 10,
) {
  return useWithMinLoadTime(useMonthlyStationAggregates(date, fuelType, limit));
}
