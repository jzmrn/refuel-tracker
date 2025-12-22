import { useState, useCallback, useRef } from "react";

interface LoadingTimers {
  delayTimer?: NodeJS.Timeout;
  minDurationTimer?: NodeJS.Timeout;
  startTime?: number;
}

/**
 * Hook for managing loading states with delayed visibility and minimum duration.
 * Prevents UI flicker from fast-completing operations.
 *
 * @param delayMs - Delay before showing loading state (default: 200ms)
 * @param minDurationMs - Minimum time to show loading once visible (default: 500ms)
 *
 * @example
 * const { isLoading, startLoading, stopLoading } = useDelayedLoading();
 *
 * const handleAction = async (id: string) => {
 *   startLoading(id);
 *   try {
 *     await performAction(id);
 *   } finally {
 *     stopLoading(id);
 *   }
 * };
 */
export function useDelayedLoading(delayMs = 200, minDurationMs = 500) {
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const timersRef = useRef<Map<string, LoadingTimers>>(new Map());

  const startLoading = useCallback(
    (id: string) => {
      // Clear any existing timers for this ID
      const existingTimers = timersRef.current.get(id);
      if (existingTimers?.delayTimer) {
        clearTimeout(existingTimers.delayTimer);
      }
      if (existingTimers?.minDurationTimer) {
        clearTimeout(existingTimers.minDurationTimer);
      }

      // Set a delay timer - only show loading if operation takes longer than delayMs
      const delayTimer = setTimeout(() => {
        setLoadingIds((prev) => new Set(prev).add(id));
        timersRef.current.set(id, {
          ...timersRef.current.get(id),
          delayTimer: undefined,
          startTime: Date.now(),
        });
      }, delayMs);

      timersRef.current.set(id, { delayTimer });
    },
    [delayMs]
  );

  const stopLoading = useCallback(
    (id: string) => {
      const timers = timersRef.current.get(id);

      if (!timers) {
        return;
      }

      // If delay timer is still pending, operation completed quickly
      // Just clear the timer and don't show loading at all
      if (timers.delayTimer) {
        clearTimeout(timers.delayTimer);
        timersRef.current.delete(id);
        return;
      }

      // If loading is visible, ensure it stays visible for minimum duration
      if (timers.startTime) {
        const elapsed = Date.now() - timers.startTime;
        const remaining = Math.max(0, minDurationMs - elapsed);

        if (remaining > 0) {
          const minDurationTimer = setTimeout(() => {
            setLoadingIds((prev) => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
            timersRef.current.delete(id);
          }, remaining);

          timersRef.current.set(id, { ...timers, minDurationTimer });
        } else {
          // Minimum duration already passed
          setLoadingIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
          timersRef.current.delete(id);
        }
      }
    },
    [minDurationMs]
  );

  const isLoading = useCallback(
    (id: string) => loadingIds.has(id),
    [loadingIds]
  );

  return {
    isLoading,
    startLoading,
    stopLoading,
    loadingIds,
  };
}
