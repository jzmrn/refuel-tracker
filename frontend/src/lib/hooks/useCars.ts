import {
  useSuspenseQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import apiService, {
  CarCreate,
  CarUpdate,
  RefuelMetricCreate,
  RefuelMetricUpdate,
  KilometerEntryCreate,
} from "@/lib/api";

// Query Keys - centralized for consistency
export const carsKeys = {
  all: ["cars"] as const,
  lists: () => [...carsKeys.all, "list"] as const,
  list: (filters: Record<string, any>) =>
    [...carsKeys.lists(), filters] as const,
  details: () => [...carsKeys.all, "detail"] as const,
  detail: (id: string) => [...carsKeys.details(), id] as const,
  refuels: (carId: string) => [...carsKeys.detail(carId), "refuels"] as const,
  refuelsPaginated: (carId: string, filters: Record<string, any>) =>
    [...carsKeys.refuels(carId), "paginated", filters] as const,
  refuelsFilterOptions: (carId: string) =>
    [...carsKeys.refuels(carId), "filterOptions"] as const,
  refuelStatistics: (carId: string) =>
    [...carsKeys.detail(carId), "statistics"] as const,
  kilometers: (carId: string) =>
    [...carsKeys.detail(carId), "kilometers"] as const,
};

/**
 * Suspense-based hook to fetch all cars with minimum loading time.
 * Must be used inside a <Suspense> boundary.
 */
export function useCars() {
  return useSuspenseQuery({
    queryKey: carsKeys.lists(),
    queryFn: async () => {
      const dataPromise = apiService.getCars();
      const [data] = await Promise.all([
        dataPromise,
        new Promise((r) => setTimeout(r, MIN_LOAD_TIME_MS)),
      ]);
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

const MIN_LOAD_TIME_MS = 500;

/**
 * Suspense-based hook to fetch a car with a minimum loading time.
 * Ensures the Suspense fallback is shown for at least 500ms to avoid
 * a flash of loading state. Uses cached data instantly when available.
 * Returns null if the car is not found.
 */
export function useCar(carId: string) {
  return useSuspenseQuery({
    queryKey: carsKeys.detail(carId),
    queryFn: async () => {
      const carPromise = apiService.getCar(carId).catch(() => null);
      const [car] = await Promise.all([
        carPromise,
        new Promise((r) => setTimeout(r, MIN_LOAD_TIME_MS)),
      ]);
      return car;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to create a new car
 * Automatically invalidates and refetches cars list
 */
export function useCreateCar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (car: CarCreate) => {
      return await apiService.createCar(car);
    },
    onSuccess: () => {
      // Invalidate cars list to trigger refetch
      queryClient.invalidateQueries({ queryKey: carsKeys.lists() });
    },
  });
}

/**
 * Hook to update an existing car
 * Automatically invalidates and refetches car details and list
 */
export function useUpdateCar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      carId,
      update,
    }: {
      carId: string;
      update: CarUpdate;
    }) => {
      return await apiService.updateCar(carId, update);
    },
    onSuccess: (_, variables) => {
      // Invalidate specific car details
      queryClient.invalidateQueries({
        queryKey: carsKeys.detail(variables.carId),
      });
      // Invalidate cars list
      queryClient.invalidateQueries({ queryKey: carsKeys.lists() });
    },
  });
}

/**
 * Hook to delete a car
 * Automatically invalidates and refetches cars list
 */
export function useDeleteCar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (carId: string) => {
      return await apiService.deleteCar(carId);
    },
    onSuccess: (_, carId) => {
      // Remove car from cache
      queryClient.removeQueries({ queryKey: carsKeys.detail(carId) });
      // Invalidate cars list
      queryClient.invalidateQueries({ queryKey: carsKeys.lists() });
    },
  });
}

/**
 * Suspense-based hook to fetch refuel metrics.
 * Must be used inside a <Suspense> boundary.
 */
export function useRefuelMetrics(
  carId: string,
  params?: {
    start_date?: string;
    end_date?: string;
    limit?: number;
  },
) {
  return useSuspenseQuery({
    queryKey: [...carsKeys.refuels(carId), params],
    queryFn: async () => {
      const metricsPromise = apiService.getRefuelMetrics({
        car_id: carId,
        ...params,
      });
      const [data] = await Promise.all([
        metricsPromise,
        new Promise((r) => setTimeout(r, MIN_LOAD_TIME_MS)),
      ]);
      return data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Suspense-based hook to fetch refuel statistics.
 * Must be used inside a <Suspense> boundary.
 */
export function useRefuelStatistics(
  carId: string,
  params?: {
    start_date?: string;
    end_date?: string;
  },
) {
  return useSuspenseQuery({
    queryKey: [...carsKeys.refuelStatistics(carId), params],
    queryFn: async () => {
      const promise = apiService.getRefuelStatistics({
        car_id: carId,
        ...params,
      });
      const [data] = await Promise.all([
        promise,
        new Promise((r) => setTimeout(r, MIN_LOAD_TIME_MS)),
      ]);
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to create a refuel metric
 * Automatically invalidates refuel metrics and statistics
 */
export function useCreateRefuelMetric() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (metric: RefuelMetricCreate) => {
      return await apiService.createRefuelMetric(metric);
    },
    onSuccess: (_, variables) => {
      // Invalidate refuel metrics for this car
      queryClient.invalidateQueries({
        queryKey: carsKeys.refuels(variables.car_id),
      });
      // Invalidate refuel statistics for this car
      queryClient.invalidateQueries({
        queryKey: carsKeys.refuelStatistics(variables.car_id),
      });
    },
  });
}

/**
 * Hook to update a refuel metric
 * Automatically invalidates refuel metrics and statistics
 */
export function useUpdateRefuelMetric() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (update: RefuelMetricUpdate) => {
      return await apiService.updateRefuelMetric(update);
    },
    onSuccess: (_, variables) => {
      // Invalidate refuel metrics for this car
      queryClient.invalidateQueries({
        queryKey: carsKeys.refuels(variables.car_id),
      });
      // Invalidate refuel statistics for this car
      queryClient.invalidateQueries({
        queryKey: carsKeys.refuelStatistics(variables.car_id),
      });
    },
  });
}

/**
 * Hook to fetch refuel filter options for a car
 */
export function useRefuelFilterOptions(carId: string) {
  return useQuery({
    queryKey: carsKeys.refuelsFilterOptions(carId),
    queryFn: () => apiService.getRefuelFilterOptions(carId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!carId,
  });
}

/**
 * Infinite query hook to fetch paginated refuel metrics with filtering and sorting
 * Supports infinite scroll
 */
export function useInfiniteRefuelMetrics(
  carId: string,
  params?: {
    sort_by?: string;
    sort_order?: string;
    station_id?: string;
    fuel_type?: string;
    year?: number;
  },
) {
  const limit = 20;

  return useInfiniteQuery({
    queryKey: carsKeys.refuelsPaginated(carId, params || {}),
    queryFn: async ({ pageParam = 0 }) => {
      return await apiService.getRefuelMetricsPaginated({
        car_id: carId,
        offset: pageParam,
        limit,
        ...params,
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (lastPage.has_more) {
        return lastPage.offset + lastPage.limit;
      }
      return undefined;
    },
    enabled: !!carId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to share a car with a user
 * Automatically invalidates car details and list
 */
export function useShareCar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      carId,
      userId,
    }: {
      carId: string;
      userId: string;
    }) => {
      return await apiService.shareCar(carId, userId);
    },
    onSuccess: (_, variables) => {
      // Invalidate specific car details
      queryClient.invalidateQueries({
        queryKey: carsKeys.detail(variables.carId),
      });
      // Invalidate cars list
      queryClient.invalidateQueries({ queryKey: carsKeys.lists() });
    },
  });
}

/**
 * Hook to revoke car access from a user
 * Automatically invalidates car details and list
 */
export function useRevokeCarAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      carId,
      userId,
    }: {
      carId: string;
      userId: string;
    }) => {
      return await apiService.revokeCarAccess(carId, userId);
    },
    onSuccess: (_, variables) => {
      // Invalidate specific car details
      queryClient.invalidateQueries({
        queryKey: carsKeys.detail(variables.carId),
      });
      // Invalidate cars list
      queryClient.invalidateQueries({ queryKey: carsKeys.lists() });
    },
  });
}

/**
 * Suspense-based hook to fetch kilometer entries with optional aggregates.
 * Must be used inside a <Suspense> boundary.
 * When aggregation is provided, the response includes interpolated aggregates.
 */
export function useKilometerEntries(
  carId: string,
  params?: {
    start_date?: string;
    end_date?: string;
    limit?: number;
    aggregation?: string;
  },
) {
  return useSuspenseQuery({
    queryKey: [...carsKeys.kilometers(carId), params],
    queryFn: async () => {
      const promise = apiService.getKilometerEntries({
        car_id: carId,
        ...params,
      });
      const [data] = await Promise.all([
        promise,
        new Promise((r) => setTimeout(r, MIN_LOAD_TIME_MS)),
      ]);
      return data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to create a kilometer entry
 * Automatically invalidates kilometer entries
 */
export function useCreateKilometerEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: KilometerEntryCreate) => {
      return await apiService.createKilometerEntry(entry);
    },
    onSuccess: (_, variables) => {
      // Invalidate kilometer entries for this car
      queryClient.invalidateQueries({
        queryKey: carsKeys.kilometers(variables.car_id),
      });
    },
  });
}

/**
 * Hook to delete a kilometer entry
 * Automatically invalidates kilometer entries
 */
export function useDeleteKilometerEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entryId,
      carId,
    }: {
      entryId: string;
      carId: string;
    }) => {
      return await apiService.deleteKilometerEntry(entryId, carId);
    },
    onSuccess: (_, variables) => {
      // Invalidate kilometer entries for this car
      queryClient.invalidateQueries({
        queryKey: carsKeys.kilometers(variables.carId),
      });
    },
  });
}
