import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiService, {
  Car,
  CarCreate,
  CarUpdate,
  RefuelMetric,
  RefuelStatistics,
  RefuelMetricCreate,
  KilometerEntry,
  KilometerEntryCreate,
} from "@/lib/api";
import { useWithMinLoadTime } from "./useWithMinLoadTime";

// Query Keys - centralized for consistency
export const carsKeys = {
  all: ["cars"] as const,
  lists: () => [...carsKeys.all, "list"] as const,
  list: (filters: Record<string, any>) =>
    [...carsKeys.lists(), filters] as const,
  details: () => [...carsKeys.all, "detail"] as const,
  detail: (id: string) => [...carsKeys.details(), id] as const,
  refuels: (carId: string) => [...carsKeys.detail(carId), "refuels"] as const,
  refuelStatistics: (carId: string) =>
    [...carsKeys.detail(carId), "statistics"] as const,
  kilometers: (carId: string) =>
    [...carsKeys.detail(carId), "kilometers"] as const,
};

/**
 * Hook to fetch all cars
 * Data is cached for 5 minutes and persists across navigation
 */
export function useCars() {
  return useQuery({
    queryKey: carsKeys.lists(),
    queryFn: async () => {
      const data = await apiService.getCars();
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch all cars with minimum loading time
 * Ensures loading state is shown for at least 500ms when data is not cached
 * This provides better UX by avoiding flash of loading state
 */
export function useCarsWithMinLoadTime() {
  return useWithMinLoadTime(useCars());
}

/**
 * Hook to fetch a single car by ID
 * Data is cached for 5 minutes and persists across navigation
 */
export function useCar(carId: string | undefined) {
  return useQuery({
    queryKey: carId ? carsKeys.detail(carId) : ["cars", "detail", "none"],
    queryFn: async () => {
      if (!carId) throw new Error("Car ID is required");
      const cars = await apiService.getCars();
      const car = cars.find((c) => c.id === carId);
      if (!car) throw new Error("Car not found");
      return car;
    },
    enabled: !!carId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch a car with minimum loading time
 * Ensures loading state is shown for at least 500ms when data is not cached
 * This provides better UX by avoiding flash of loading state
 */
export function useCarWithMinLoadTime(carId: string | undefined) {
  return useWithMinLoadTime(useCar(carId));
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
 * Hook to fetch refuel metrics for a car
 * Data is cached for 2 minutes
 */
export function useRefuelMetrics(
  carId: string | undefined,
  params?: {
    start_date?: string;
    end_date?: string;
    limit?: number;
  }
) {
  return useQuery({
    queryKey: carId
      ? [...carsKeys.refuels(carId), params]
      : ["refuels", "none"],
    queryFn: async () => {
      if (!carId) throw new Error("Car ID is required");
      const data = await apiService.getRefuelMetrics({
        car_id: carId,
        ...params,
      });
      return data;
    },
    enabled: !!carId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to fetch refuel metrics with minimum loading time
 * Ensures loading state is shown for at least 500ms when data is not cached
 * This provides better UX by avoiding flash of loading state
 */
export function useRefuelMetricsWithMinLoadTime(
  carId: string | undefined,
  params?: {
    start_date?: string;
    end_date?: string;
    limit?: number;
  }
) {
  return useWithMinLoadTime(useRefuelMetrics(carId, params));
}

/**
 * Hook to fetch refuel statistics for a car
 * Data is cached for 5 minutes
 */
export function useRefuelStatistics(
  carId: string | undefined,
  params?: {
    start_date?: string;
    end_date?: string;
  }
) {
  return useQuery({
    queryKey: carId
      ? [...carsKeys.refuelStatistics(carId), params]
      : ["refuelStatistics", "none"],
    queryFn: async () => {
      if (!carId) throw new Error("Car ID is required");
      const data = await apiService.getRefuelStatistics({
        car_id: carId,
        ...params,
      });
      return data;
    },
    enabled: !!carId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch refuel statistics with minimum loading time
 * Ensures loading state is shown for at least 500ms when data is not cached
 * This provides better UX by avoiding flash of loading state
 */
export function useRefuelStatisticsWithMinLoadTime(
  carId: string | undefined,
  params?: {
    start_date?: string;
    end_date?: string;
  }
) {
  return useWithMinLoadTime(useRefuelStatistics(carId, params));
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
 * Hook to fetch kilometer entries for a car
 * Data is cached for 2 minutes
 */
export function useKilometerEntries(
  carId: string | undefined,
  params?: {
    start_date?: string;
    end_date?: string;
    limit?: number;
  }
) {
  return useQuery({
    queryKey: carId
      ? [...carsKeys.kilometers(carId), params]
      : ["kilometers", "none"],
    queryFn: async () => {
      if (!carId) throw new Error("Car ID is required");
      const data = await apiService.getKilometerEntries({
        car_id: carId,
        ...params,
      });
      return data;
    },
    enabled: !!carId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to fetch kilometer entries with minimum loading time
 * Ensures loading state is shown for at least 500ms when data is not cached
 * This provides better UX by avoiding flash of loading state
 */
export function useKilometerEntriesWithMinLoadTime(
  carId: string | undefined,
  params?: {
    start_date?: string;
    end_date?: string;
    limit?: number;
  }
) {
  return useWithMinLoadTime(useKilometerEntries(carId, params));
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
