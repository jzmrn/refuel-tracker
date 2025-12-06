import React, { useState, useEffect } from "react";
import { Car, CarStatistics as CarStats, apiService } from "../../lib/api";
import BarChartIcon from "@mui/icons-material/BarChart";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import ScienceIcon from "@mui/icons-material/Science";

interface CarStatisticsTabProps {
  cars: Car[];
  loading: boolean;
  onError: (message: string) => void;
}

const CarStatisticsTab: React.FC<CarStatisticsTabProps> = ({
  cars,
  loading,
  onError,
}) => {
  const [selectedCar, setSelectedCar] = useState<string>("");
  const [statistics, setStatistics] = useState<CarStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    if (selectedCar) {
      loadStatistics();
    } else {
      setStatistics(null);
    }
  }, [selectedCar]);

  const loadStatistics = async () => {
    if (!selectedCar) return;

    try {
      setLoadingStats(true);
      const stats = await apiService.getCarStatistics(selectedCar);
      setStatistics(stats);
    } catch (error: any) {
      console.error("Error loading statistics:", error);
      onError("Failed to load statistics");
    } finally {
      setLoadingStats(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const selectedCarData = cars.find((c) => c.id === selectedCar);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Car Statistics
        </h2>
      </div>

      {cars.length === 0 ? (
        <div className="card text-center py-12">
          <DirectionsCarIcon className="icon-xl text-gray-600 dark:text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            No cars available. Add a car in the "My Cars" tab to view
            statistics.
          </p>
        </div>
      ) : (
        <>
          {/* Car Selector */}
          <div className="card">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select a car to view statistics
            </label>
            <select
              value={selectedCar}
              onChange={(e) => setSelectedCar(e.target.value)}
              className="input"
            >
              <option value="">-- Select a car --</option>
              {cars.map((car) => (
                <option key={car.id} value={car.id}>
                  {car.name} ({car.year})
                  {!car.is_owner && ` - Shared by ${car.shared_by}`}
                </option>
              ))}
            </select>
          </div>

          {/* Statistics Display */}
          {selectedCar && (
            <>
              {loadingStats ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : statistics ? (
                <div className="space-y-6">
                  {/* Car Info Header */}
                  {selectedCarData && (
                    <div className="card bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                      <div className="flex items-center gap-3 mb-2">
                        <DirectionsCarIcon className="icon-lg text-blue-600 dark:text-blue-400" />
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                            {selectedCarData.name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Year: {selectedCarData.year} | Fuel Tank:{" "}
                            {selectedCarData.fuel_tank_size}L
                          </p>
                        </div>
                      </div>
                      {!selectedCarData.is_owner && (
                        <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
                          Shared by {selectedCarData.shared_by}
                        </p>
                      )}
                    </div>
                  )}

                  {statistics.total_refuels === 0 ? (
                    <div className="card text-center py-12">
                      <BarChartIcon className="icon-xl text-gray-600 dark:text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">
                        No refuel data available for this car yet
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Summary Stats Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="stat-card">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              Total Refuels
                            </span>
                            <BarChartIcon className="icon-sm text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">
                            {statistics.total_refuels}
                          </div>
                        </div>

                        <div className="stat-card">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              Total Distance
                            </span>
                            <BarChartIcon className="icon-sm text-green-600 dark:text-green-400" />
                          </div>
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">
                            {statistics.total_distance.toLocaleString()} km
                          </div>
                        </div>

                        <div className="stat-card">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              Total Fuel
                            </span>
                            <ScienceIcon className="icon-sm text-purple-600 dark:text-purple-400" />
                          </div>
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">
                            {statistics.total_fuel.toFixed(1)} L
                          </div>
                        </div>

                        <div className="stat-card">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              Total Cost
                            </span>
                            <AttachMoneyIcon className="icon-sm text-orange-600 dark:text-orange-400" />
                          </div>
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">
                            €{statistics.total_cost.toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {/* Averages and Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="card">
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Averages
                          </h4>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                Consumption
                              </span>
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {statistics.average_consumption.toFixed(2)}{" "}
                                L/100km
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                Price per Liter
                              </span>
                              <span className="font-semibold text-gray-900 dark:text-white">
                                €{statistics.average_price_per_liter.toFixed(3)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                Cost per Refuel
                              </span>
                              <span className="font-semibold text-gray-900 dark:text-white">
                                €
                                {(
                                  statistics.total_cost /
                                  statistics.total_refuels
                                ).toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                Distance per Refuel
                              </span>
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {(
                                  statistics.total_distance /
                                  statistics.total_refuels
                                ).toFixed(0)}{" "}
                                km
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="card">
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Timeline
                          </h4>
                          <div className="space-y-3">
                            {statistics.first_refuel && (
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  First Refuel
                                </span>
                                <span className="font-semibold text-gray-900 dark:text-white">
                                  {new Date(
                                    statistics.first_refuel,
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                            {statistics.last_refuel && (
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  Last Refuel
                                </span>
                                <span className="font-semibold text-gray-900 dark:text-white">
                                  {new Date(
                                    statistics.last_refuel,
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                            {statistics.first_refuel &&
                              statistics.last_refuel && (
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-600 dark:text-gray-400">
                                    Tracking Period
                                  </span>
                                  <span className="font-semibold text-gray-900 dark:text-white">
                                    {Math.floor(
                                      (new Date(
                                        statistics.last_refuel,
                                      ).getTime() -
                                        new Date(
                                          statistics.first_refuel,
                                        ).getTime()) /
                                        (1000 * 60 * 60 * 24),
                                    )}{" "}
                                    days
                                  </span>
                                </div>
                              )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="card text-center py-12">
                  <p className="text-gray-600 dark:text-gray-400">
                    No statistics available
                  </p>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default CarStatisticsTab;
