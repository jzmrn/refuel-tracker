import { useQuery } from "@tanstack/react-query";
import apiService from "@/lib/api";

export const placesKeys = {
  all: ["places"] as const,
  search: (query: string, limit: number) =>
    [...placesKeys.all, "search", query, limit] as const,
  detail: (placeId: string) => [...placesKeys.all, "detail", placeId] as const,
};

/** Minimum number of characters before an autocomplete request is issued. */
export const MIN_PLACE_QUERY_LENGTH = 2;

/**
 * Hook to autocomplete German municipalities by name or postal code.
 * Results are cached indefinitely because the dataset is static.
 */
export function usePlaceSearch(query: string, limit = 10) {
  const trimmed = query.trim();
  const enabled = trimmed.length >= MIN_PLACE_QUERY_LENGTH;

  return useQuery({
    queryKey: placesKeys.search(trimmed.toLowerCase(), limit),
    queryFn: () => apiService.searchPlaces(trimmed, limit),
    enabled,
    staleTime: Infinity,
    placeholderData: (previous) => previous,
  });
}

/**
 * Hook to resolve a single place by its official regional key (ARS).
 * Used to restore the selected city when a search is reopened from a URL.
 */
export function usePlace(placeId: string | undefined) {
  return useQuery({
    queryKey: placesKeys.detail(placeId ?? ""),
    queryFn: () => apiService.getPlace(placeId as string),
    enabled: Boolean(placeId),
    staleTime: Infinity,
    retry: false,
  });
}
