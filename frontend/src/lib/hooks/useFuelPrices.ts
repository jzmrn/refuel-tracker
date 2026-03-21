import {
  useQuery,
  useSuspenseQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import apiService, {
  GasStationSearchRequest,
  FuelType,
  PriceHistoryTimeRange,
  DailyStatsTimeRange,
  getTimeRangeHours,
  getDailyStatsRangeDays,
} from "@/lib/api";

const MIN_LOAD_TIME_MS = 500;

// Query Keys - centralized for consistency
export const fuelPricesKeys = {
  all: ["fuelPrices"] as const,
  favorites: () => [...fuelPricesKeys.all, "favorites"] as const,
  search: (params: Record<string, any>) =>
    [...fuelPricesKeys.all, "search", params] as const,
  stationMeta: (stationId: string) =>
    [...fuelPricesKeys.all, "stationMeta", stationId] as const,
  stationPriceHistory: (
    stationId: string,
    fuelType: FuelType,
    timeRange: PriceHistoryTimeRange = PriceHistoryTimeRange.OneDay,
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
    timeRange: DailyStatsTimeRange = DailyStatsTimeRange.OneWeek,
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
 * Suspense-based hook to fetch favorite fuel stations.
 * Must be used inside a <Suspense> boundary.
 * Data is cached for 5 minutes and persists across navigation.
 */
export function useFavoriteStations() {
  return useSuspenseQuery({
    queryKey: fuelPricesKeys.favorites(),
    queryFn: async () => {
      const dataPromise = apiService.getFavoriteStations();
      const [data] = await Promise.all([
        dataPromise,
        new Promise((r) => setTimeout(r, MIN_LOAD_TIME_MS)),
      ]);
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
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
 * Uses useQuery (not suspense) because it requires conditional `enabled`
 */
export function useSearchStations(
  params: GasStationSearchRequest | null,
  enabled: boolean = true,
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
 * Suspense-based hook to fetch station meta information.
 * Must be used inside a <Suspense> boundary.
 */
export function useStationMeta(stationId: string) {
  return useSuspenseQuery({
    queryKey: fuelPricesKeys.stationMeta(stationId),
    queryFn: async () => {
      const dataPromise = apiService.getStationMeta(stationId);
      const [data] = await Promise.all([
        dataPromise,
        new Promise((r) => setTimeout(r, MIN_LOAD_TIME_MS)),
      ]);
      return data;
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });
}

/**
 * Suspense-based hook to fetch station price history for a specific fuel type.
 * Must be used inside a <Suspense> boundary.
 */
export function useStationPriceHistory(
  stationId: string,
  fuelType: FuelType,
  timeRange: PriceHistoryTimeRange = PriceHistoryTimeRange.OneDay,
) {
  const hours = getTimeRangeHours(timeRange);
  return useSuspenseQuery({
    queryKey: fuelPricesKeys.stationPriceHistory(
      stationId,
      fuelType,
      timeRange,
    ),
    queryFn: async () => {
      const dataPromise = apiService.getStationPriceHistory(
        stationId,
        fuelType,
        hours,
      );
      const [data] = await Promise.all([
        dataPromise,
        new Promise((r) => setTimeout(r, MIN_LOAD_TIME_MS)),
      ]);
      return data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });
}

/**
 * Suspense-based hook to fetch station daily statistics for a specific fuel type.
 * Must be used inside a <Suspense> boundary.
 */
export function useStationDailyStats(
  stationId: string,
  fuelType: FuelType,
  timeRange: DailyStatsTimeRange = DailyStatsTimeRange.OneWeek,
) {
  const days = getDailyStatsRangeDays(timeRange);
  return useSuspenseQuery({
    queryKey: fuelPricesKeys.stationDailyStats(stationId, fuelType, timeRange),
    queryFn: async () => {
      const dataPromise = apiService.getStationDailyStats(
        stationId,
        fuelType,
        days,
      );
      const [data] = await Promise.all([
        dataPromise,
        new Promise((r) => setTimeout(r, MIN_LOAD_TIME_MS)),
      ]);
      return data;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // Keep in cache for 1 hour
  });
}
