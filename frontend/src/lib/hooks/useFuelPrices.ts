import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiService, {
  GasStationResponse,
  FavoriteStationResponse,
  GasStationSearchRequest,
} from "@/lib/api";

// Query Keys - centralized for consistency
export const fuelPricesKeys = {
  all: ["fuelPrices"] as const,
  favorites: () => [...fuelPricesKeys.all, "favorites"] as const,
  search: (params: Record<string, any>) =>
    [...fuelPricesKeys.all, "search", params] as const,
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
