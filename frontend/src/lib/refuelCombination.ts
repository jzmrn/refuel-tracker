/**
 * Utility for combining partial refuel entries into accurate consumption groups.
 *
 * When a user doesn't fill the tank completely, consumption calculations are
 * inaccurate for individual entries. This module combines consecutive partial
 * fills with the next full fill to produce accurate consumption figures.
 *
 * Algorithm:
 * - Walk through entries sorted by timestamp (ascending)
 * - Accumulate partial fills into a "pending" group
 * - When a full fill is encountered, close the group (all pending + the full fill)
 * - Trailing partials with no closing full fill form an "incomplete" group
 */

import { RefuelMetric } from "./api";

export interface CombinedRefuelGroup {
  /** All individual entries in this group (partials + the closing full fill) */
  entries: RefuelMetric[];
  /** Sum of all amounts (liters) in the group */
  totalLiters: number;
  /** Sum of all kilometers in the group */
  totalKilometers: number;
  /** Sum of all costs (price * amount) in the group */
  totalCost: number;
  /** Combined consumption: (totalLiters / totalKm) * 100 */
  combinedConsumption: number;
  /** Combined cost per 100km: (totalCost / totalKm) * 100 */
  combinedCostPer100km: number;
  /** Whether this group contains more than one entry (i.e., has partial fills) */
  isCombined: boolean;
  /** Whether the group ends with a full fill (complete = accurate data) */
  isComplete: boolean;
  /** Timestamp of the anchor entry (the full-fill that closes the group, or the last partial) */
  anchorTimestamp: string;
  /** Average price per liter across all entries in the group */
  averagePricePerLiter: number;
}

/**
 * Combines refuel entries into groups for accurate consumption calculation.
 *
 * @param refuels Array of refuel metrics (will be sorted internally)
 * @returns Array of combined groups, sorted by anchor timestamp ascending
 */
export function combineRefuelEntries(
  refuels: RefuelMetric[],
): CombinedRefuelGroup[] {
  if (!refuels || refuels.length === 0) return [];

  // Sort by timestamp ascending
  const sorted = [...refuels].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const groups: CombinedRefuelGroup[] = [];
  let pendingPartials: RefuelMetric[] = [];

  for (const entry of sorted) {
    // Treat entries without is_full_tank field as full (backward compat)
    const isFull = entry.is_full_tank !== false;

    if (isFull) {
      // Close the group: all pending partials + this full fill
      const groupEntries = [...pendingPartials, entry];
      groups.push(buildGroup(groupEntries, true));
      pendingPartials = [];
    } else {
      pendingPartials.push(entry);
    }
  }

  // Trailing partials (no closing full-fill yet)
  if (pendingPartials.length > 0) {
    groups.push(buildGroup(pendingPartials, false));
  }

  return groups;
}

/**
 * Builds a CombinedRefuelGroup from a list of entries.
 */
function buildGroup(
  entries: RefuelMetric[],
  isComplete: boolean,
): CombinedRefuelGroup {
  const totalLiters = entries.reduce((sum, e) => sum + e.amount, 0);
  const totalKilometers = entries.reduce(
    (sum, e) => sum + e.kilometers_since_last_refuel,
    0,
  );
  const totalCost = entries.reduce((sum, e) => sum + e.price * e.amount, 0);

  const combinedConsumption =
    totalKilometers > 0 ? (totalLiters / totalKilometers) * 100 : 0;
  const combinedCostPer100km =
    totalKilometers > 0 ? (totalCost / totalKilometers) * 100 : 0;
  const averagePricePerLiter = totalLiters > 0 ? totalCost / totalLiters : 0;

  const anchorEntry = entries[entries.length - 1];

  return {
    entries,
    totalLiters,
    totalKilometers,
    totalCost,
    combinedConsumption,
    combinedCostPer100km,
    isCombined: entries.length > 1,
    isComplete,
    anchorTimestamp: anchorEntry.timestamp,
    averagePricePerLiter,
  };
}

/**
 * Returns the partial refuel entries that have not been closed by a full fill
 * yet. Those entries have to be combined with the next full fill to get an
 * accurate consumption.
 */
export function getPendingPartials(refuels: RefuelMetric[]): RefuelMetric[] {
  const groups = combineRefuelEntries(refuels);
  const last = groups[groups.length - 1];
  if (!last || last.isComplete) return [];
  return last.entries;
}

/**
 * Returns chart data for consumption/cost charts.
 * Shows combined bars by default. Only shows individual entries when they are
 * trailing partials with no closing full fill (incomplete group).
 */
export interface CombinedChartDataPoint {
  timestamp: string;
  timestampMs: number;
  /** Timestamps of all entries contained in this data point (ascending) */
  entryTimestamps: string[];
  consumption: number;
  costPer100km: number;
  totalCost: number;
  totalLiters: number;
  totalKilometers: number;
  averagePricePerLiter: number;
  isCombined: boolean;
  isComplete: boolean;
  entryCount: number;
}

export function getCombinedChartData(
  refuels: RefuelMetric[],
): CombinedChartDataPoint[] {
  const groups = combineRefuelEntries(refuels);
  const chartData: CombinedChartDataPoint[] = [];

  for (const group of groups) {
    if (group.isComplete) {
      // Show as a single combined data point at the anchor timestamp
      chartData.push({
        timestamp: group.anchorTimestamp,
        timestampMs: new Date(group.anchorTimestamp).getTime(),
        entryTimestamps: group.entries.map((e) => e.timestamp),
        consumption: parseFloat(group.combinedConsumption.toFixed(2)),
        costPer100km: parseFloat(group.combinedCostPer100km.toFixed(2)),
        totalCost: parseFloat(group.totalCost.toFixed(2)),
        totalLiters: parseFloat(group.totalLiters.toFixed(2)),
        totalKilometers: parseFloat(group.totalKilometers.toFixed(1)),
        averagePricePerLiter: parseFloat(group.averagePricePerLiter.toFixed(3)),
        isCombined: group.isCombined,
        isComplete: true,
        entryCount: group.entries.length,
      });
    } else {
      // Incomplete trailing group — show individual entries
      for (const entry of group.entries) {
        const consumption =
          entry.kilometers_since_last_refuel > 0
            ? (entry.amount / entry.kilometers_since_last_refuel) * 100
            : 0;
        const cost = entry.price * entry.amount;
        const costPer100km =
          entry.kilometers_since_last_refuel > 0
            ? (cost / entry.kilometers_since_last_refuel) * 100
            : 0;

        chartData.push({
          timestamp: entry.timestamp,
          timestampMs: new Date(entry.timestamp).getTime(),
          entryTimestamps: [entry.timestamp],
          consumption: parseFloat(consumption.toFixed(2)),
          costPer100km: parseFloat(costPer100km.toFixed(2)),
          totalCost: parseFloat(cost.toFixed(2)),
          totalLiters: parseFloat(entry.amount.toFixed(2)),
          totalKilometers: parseFloat(
            entry.kilometers_since_last_refuel.toFixed(1),
          ),
          averagePricePerLiter: parseFloat(entry.price.toFixed(3)),
          isCombined: false,
          isComplete: false,
          entryCount: 1,
        });
      }
    }
  }

  return chartData;
}

/**
 * Data point for the tank usage chart.
 *
 * Tank usage describes how much of the tank capacity was refuelled. Partial
 * fills are combined with the following full fill: the bar then shows the
 * *average* tank usage per refuel of that group (e.g. a 10 L partial fill
 * followed by a 40 L full fill on a 50 L tank results in 50 %).
 */
export interface TankUsageChartDataPoint {
  timestamp: string;
  timestampMs: number;
  /** Timestamps of all entries contained in this data point (ascending) */
  entryTimestamps: string[];
  /** Total liters refuelled in the group */
  totalLiters: number;
  /** Average liters per refuel in the group */
  averageLiters: number;
  /** Average tank usage per refuel in the group, in percent */
  tankUsage: number;
  isCombined: boolean;
  isComplete: boolean;
  entryCount: number;
}

export function getTankUsageChartData(
  refuels: RefuelMetric[],
  fuelTankSize: number,
): TankUsageChartDataPoint[] {
  if (!fuelTankSize || fuelTankSize <= 0) return [];

  const groups = combineRefuelEntries(refuels);
  const chartData: TankUsageChartDataPoint[] = [];

  const toPoint = (
    timestamp: string,
    entryTimestamps: string[],
    totalLiters: number,
    entryCount: number,
    isCombined: boolean,
    isComplete: boolean,
  ): TankUsageChartDataPoint => {
    const averageLiters = entryCount > 0 ? totalLiters / entryCount : 0;
    return {
      timestamp,
      timestampMs: new Date(timestamp).getTime(),
      entryTimestamps,
      totalLiters: parseFloat(totalLiters.toFixed(2)),
      averageLiters: parseFloat(averageLiters.toFixed(2)),
      tankUsage: parseFloat(((averageLiters / fuelTankSize) * 100).toFixed(1)),
      isCombined,
      isComplete,
      entryCount,
    };
  };

  for (const group of groups) {
    if (group.isComplete) {
      chartData.push(
        toPoint(
          group.anchorTimestamp,
          group.entries.map((e) => e.timestamp),
          group.totalLiters,
          group.entries.length,
          group.isCombined,
          true,
        ),
      );
    } else {
      // Incomplete trailing group — no closing full fill yet, show entries
      // individually and exclude them from the statistics.
      for (const entry of group.entries) {
        chartData.push(
          toPoint(entry.timestamp, [entry.timestamp], entry.amount, 1, false, false),
        );
      }
    }
  }

  return chartData;
}
