import { useState, useEffect, useMemo } from "react";
import { UseQueryResult } from "@tanstack/react-query";

const DEFAULT_MIN_LOAD_TIME_MS = 500;

/**
 * Return type for useWithMinLoadTime that overrides isLoading to be a simple boolean
 */
type WithMinLoadTimeResult<TData, TError> = Omit<
  UseQueryResult<TData, TError>,
  "isLoading"
> & {
  isLoading: boolean;
};

/**
 * Wrapper hook that ensures a query shows loading state for at least a minimum duration.
 * This provides better UX by avoiding flash of loading state for fast queries.
 *
 * @param query - The react-query result to wrap
 * @param minLoadTimeMs - Minimum time to show loading state (default: 500ms)
 * @returns The query result with modified isLoading that respects minimum load time
 *
 * @example
 * // Basic usage
 * export function useCarsWithMinLoadTime() {
 *   return useWithMinLoadTime(useCars());
 * }
 *
 * // With custom minimum time
 * export function useCarsWithMinLoadTime() {
 *   return useWithMinLoadTime(useCars(), 300);
 * }
 */
export function useWithMinLoadTime<TData, TError>(
  query: UseQueryResult<TData, TError>,
  minLoadTimeMs: number = DEFAULT_MIN_LOAD_TIME_MS
): WithMinLoadTimeResult<TData, TError> {
  const [minLoadTimeElapsed, setMinLoadTimeElapsed] = useState(false);
  const [loadStartTime, setLoadStartTime] = useState<number | null>(null);

  useEffect(() => {
    // Track when loading starts
    if (query.isLoading && query.fetchStatus === "fetching" && !loadStartTime) {
      setLoadStartTime(Date.now());
      setMinLoadTimeElapsed(false);
    }

    // Track when minimum time has elapsed
    if (loadStartTime && !minLoadTimeElapsed) {
      const elapsed = Date.now() - loadStartTime;
      const remaining = Math.max(0, minLoadTimeMs - elapsed);

      const timer = setTimeout(() => {
        setMinLoadTimeElapsed(true);
        setLoadStartTime(null);
      }, remaining);

      return () => clearTimeout(timer);
    }

    // Reset when query completes without fetching (cached data)
    if (!query.isLoading && query.fetchStatus !== "fetching") {
      setMinLoadTimeElapsed(true);
      setLoadStartTime(null);
    }
  }, [
    query.isLoading,
    query.fetchStatus,
    loadStartTime,
    minLoadTimeElapsed,
    minLoadTimeMs,
  ]);

  // Show loading if query is loading OR minimum time hasn't elapsed yet
  const isLoading =
    query.isLoading || (loadStartTime !== null && !minLoadTimeElapsed);

  // Memoize to maintain referential equality when possible
  return useMemo(
    () => ({
      ...query,
      isLoading,
    }),
    [query, isLoading]
  );
}
