import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiService, {
  GasStationSearchRequest,
  FuelType,
  PriceHistoryTimeRange,
  DailyStatsTimeRange,
  getTimeRangeHours,
  getDailyStatsRangeDays,
} from "@/lib/api";
import { useWithMinLoadTime } from "./useWithMinLoadTime";

// Query Keys - centralized for consistency
export const fuelPricesKeys = {
  all: ["fuelPrices"] as const,
  favorites: () => [...fuelPricesKeys.all, "favorites"] as const,
  search: (params: Record<string, any>) =>
    [...fuelPricesKeys.all, "search", params] as const,
  stationDetails: (stationId: string) =>
    [...fuelPricesKeys.all, "stationDetails", stationId] as const,
  stationMeta: (stationId: string) =>
    [...fuelPricesKeys.all, "stationMeta", stationId] as const,
  stationPriceHistory: (
    stationId: string,
    fuelType: FuelType,
    timeRange: PriceHistoryTimeRange = PriceHistoryTimeRange.OneDay
  ) =>
    [
      ...fuelPricesKeys.all,
      "stationPriceHistory",
      stationId,
      fuelType,
      timeRange,
    ] as const,
  stationDailyStats: (
    stationId: string,
    fuelType: FuelType,
    timeRange: DailyStatsTimeRange = DailyStatsTimeRange.OneWeek
  ) =>
    [
      ...fuelPricesKeys.all,
      "stationDailyStats",
      stationId,
      fuelType,
      timeRange,
    ] as const,
};

/**
 * Hook to fetch favorite fuel stations
 * Data is cached for 5 minutes and persists across navigation
 */
export function useFavoriteStations() {
  return useQuery({
    queryKey: fuelPricesKeys.favorites(),
    queryFn: async () => {
      const data = await apiService.getFavoriteStations();
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch favorite fuel stations with minimum loading time
 * Ensures loading state is shown for at least 500ms when data is not cached
 * This provides better UX by avoiding flash of loading state
 */
export function useFavoriteStationsWithMinLoadTime() {
  return useWithMinLoadTime(useFavoriteStations());
}

/**
 * Hook to add a station to favorites
 * Automatically invalidates and refetches favorites list
 */
export function useAddFavoriteStation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (stationId: string) => {
      return await apiService.addFavoriteStation(stationId);
    },
    onSuccess: () => {
      // Invalidate favorites query to trigger refetch
      queryClient.invalidateQueries({ queryKey: fuelPricesKeys.favorites() });
    },
  });
}

/**
 * Hook to remove a station from favorites
 * Automatically invalidates and refetches favorites list
 */
export function useRemoveFavoriteStation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (stationId: string) => {
      return await apiService.deleteFavoriteStation(stationId);
    },
    onSuccess: () => {
      // Invalidate favorites query to trigger refetch
      queryClient.invalidateQueries({ queryKey: fuelPricesKeys.favorites() });
    },
  });
}

/**
 * Hook to manually refetch favorites (for pull-to-refresh scenarios)
 */
export function useRefreshFavorites() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: fuelPricesKeys.favorites() });
  };
}

/**
 * Hook to search for gas stations
 * Results are cached based on search parameters
 * Data persists across navigation for 10 minutes
 */
export function useSearchStations(
  params: GasStationSearchRequest | null,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: fuelPricesKeys.search(params || {}),
    queryFn: async () => {
      if (!params) return [];
      return await apiService.searchGasStations(params);
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    enabled: enabled && params !== null,
  });
}

/**
 * Hook to fetch station details
 * Data is cached for 15 minutes and persists across navigation
 * Use useStationDetailsWithMinLoadTime for user-facing loading with minimum duration
 */
export function useStationDetails(stationId: string | undefined | null) {
  return useQuery({
    queryKey: fuelPricesKeys.stationDetails(stationId || ""),
    queryFn: async () => {
      if (!stationId) return null;
      return await apiService.getStationDetails(stationId);
    },
    enabled: !!stationId,
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });
}

/**
 * Hook to fetch station details with minimum loading time
 * Ensures loading state is shown for at least 500ms when data is not cached
 * This provides better UX by avoiding flash of loading state
 */
export function useStationDetailsWithMinLoadTime(
  stationId: string | undefined | null
) {
  return useWithMinLoadTime(useStationDetails(stationId));
}

/**
 * Hook to fetch station meta information (without price history)
 * Data is cached for 15 minutes and persists across navigation
 */
export function useStationMeta(stationId: string | undefined | null) {
  return useQuery({
    queryKey: fuelPricesKeys.stationMeta(stationId || ""),
    queryFn: async () => {
      if (!stationId) return null;
      return await apiService.getStationMeta(stationId);
    },
    enabled: !!stationId,
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });
}

/**
 * Hook to fetch station meta with minimum loading time
 * Ensures loading state is shown for at least 500ms when data is not cached
 */
export function useStationMetaWithMinLoadTime(
  stationId: string | undefined | null
) {
  return useWithMinLoadTime(useStationMeta(stationId));
}

/**
 * Hook to fetch station price history for a specific fuel type
 * Data is cached for 10 minutes and persists across navigation
 */
export function useStationPriceHistory(
  stationId: string | undefined | null,
  fuelType: FuelType,
  timeRange: PriceHistoryTimeRange = PriceHistoryTimeRange.OneDay
) {
  const hours = getTimeRangeHours(timeRange);
  return useQuery({
    queryKey: fuelPricesKeys.stationPriceHistory(
      stationId || "",
      fuelType,
      timeRange
    ),
    queryFn: async () => {
      if (!stationId) return null;
      return await apiService.getStationPriceHistory(
        stationId,
        fuelType,
        hours
      );
    },
    enabled: !!stationId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });
}

/**
 * Hook to fetch station price history with minimum loading time
 */
export function useStationPriceHistoryWithMinLoadTime(
  stationId: string | undefined | null,
  fuelType: FuelType,
  timeRange: PriceHistoryTimeRange = PriceHistoryTimeRange.OneDay
) {
  return useWithMinLoadTime(
    useStationPriceHistory(stationId, fuelType, timeRange)
  );
}

/**
 * Hook to fetch station daily statistics for a specific fuel type
 * Data is cached for 30 minutes and persists across navigation
 */
export function useStationDailyStats(
  stationId: string | undefined | null,
  fuelType: FuelType,
  timeRange: DailyStatsTimeRange = DailyStatsTimeRange.OneWeek
) {
  const days = getDailyStatsRangeDays(timeRange);
  return useQuery({
    queryKey: fuelPricesKeys.stationDailyStats(
      stationId || "",
      fuelType,
      timeRange
    ),
    queryFn: async () => {
      if (!stationId) return null;
      return await apiService.getStationDailyStats(stationId, fuelType, days);
    },
    enabled: !!stationId,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // Keep in cache for 1 hour
  });
}

/**
 * Hook to fetch station daily stats with minimum loading time
 */
export function useStationDailyStatsWithMinLoadTime(
  stationId: string | undefined | null,
  fuelType: FuelType,
  timeRange: DailyStatsTimeRange = DailyStatsTimeRange.OneWeek
) {
  return useWithMinLoadTime(
    useStationDailyStats(stationId, fuelType, timeRange)
  );
}
