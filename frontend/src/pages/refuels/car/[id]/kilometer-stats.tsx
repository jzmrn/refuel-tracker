import { useState } from "react";
import { useRouter } from "next/router";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Panel from "@/components/common/Panel";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import {
  useCarWithMinLoadTime,
  useKilometerEntriesWithMinLoadTime,
} from "@/lib/hooks/useCars";
import CircularProgress from "@mui/material/CircularProgress";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useChartTheme } from "@/lib/theme";

type FilterType = "month" | "6months" | "all";

export default function KilometerStats() {
  const { t } = useTranslation();
  const router = useRouter();
  const chartTheme = useChartTheme();
  const { id } = router.query;
  const carId = typeof id === "string" ? id : undefined;

  // Fetch car details
  const {
    data: car,
    isLoading: carLoading,
    error: carError,
  } = useCarWithMinLoadTime(carId);

  const [activeFilter, setActiveFilter] = useState<FilterType>("month");

  // Calculate date filters
  const getFilterDates = () => {
    const now = new Date();
    let startDate: string | undefined;

    if (activeFilter === "month") {
      const lastMonth = new Date(now);
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      startDate = lastMonth.toISOString().split("T")[0];
    } else if (activeFilter === "6months") {
      const sixMonthsAgo = new Date(now);
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      startDate = sixMonthsAgo.toISOString().split("T")[0];
    }
    // 'all' means no start date filter

    return { start_date: startDate };
  };

  // Fetch kilometer entries with current filter
  const { data: kilometerEntries = [], isLoading: kilometersLoading } =
    useKilometerEntriesWithMinLoadTime(carId, {
      ...getFilterDates(),
      limit: 1000,
    });

  const handleBack = () => {
    router.back();
  };

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
  };

  // Prepare chart data - sort by timestamp ascending for the chart
  const chartData = [...kilometerEntries]
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    )
    .map((entry) => ({
      timestamp: new Date(entry.timestamp).getTime(),
      total_kilometers: entry.total_kilometers,
      displayDate: new Date(entry.timestamp).toLocaleDateString("en-GB", {
        month: "short",
        day: "numeric",
        year: "2-digit",
      }),
    }));

  const formatKilometers = (value: number) => {
    return new Intl.NumberFormat("de-DE").format(Math.round(value)) + " km";
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const date = new Date(label);
      const formattedDate = date.toLocaleDateString("en-GB", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const formattedTime = date.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      return (
        <div className="panel">
          <div className="mb-2">
            <p className="font-medium text-primary">{formattedDate}</p>
            <p className="text-sm text-secondary">{formattedTime}</p>
          </div>
          <div className="space-y-1 text-sm">
            <p className="text-blue-600 dark:text-blue-400">
              <span className="font-medium">
                {t.kilometers.totalKilometers}:{" "}
              </span>
              {formatKilometers(payload[0].value)}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (carError) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-4 md:py-8">
        <Panel>
          <p className="text-red-600 dark:text-red-400">
            {t.cars.failedToLoadCar}
          </p>
        </Panel>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 md:py-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={handleBack}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={t.common.back}
          >
            <ArrowBackIcon className="icon text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex-1">
            <h1 className="heading-1">{t.kilometers.kilometerHistory}</h1>
            {car && (
              <p className="text-sm text-secondary mt-1">
                {car.name} ({car.year})
              </p>
            )}
          </div>
        </div>
      </div>

      {car ? (
        <div className="space-y-6">
          {/* Filter Options */}
          <div className="panel">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <h2 className="heading-2">{t.kilometers.filter}</h2>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => handleFilterChange("month")}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeFilter === "month"
                      ? "bg-primary-50 text-primary-700 dark:bg-blue-900/20 dark:text-blue-300"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {t.kilometers.lastMonth}
                </button>
                <button
                  onClick={() => handleFilterChange("6months")}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeFilter === "6months"
                      ? "bg-primary-50 text-primary-700 dark:bg-blue-900/20 dark:text-blue-300"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {t.kilometers.lastSixMonths}
                </button>
                <button
                  onClick={() => handleFilterChange("all")}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeFilter === "all"
                      ? "bg-primary-50 text-primary-700 dark:bg-blue-900/20 dark:text-blue-300"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {t.kilometers.all}
                </button>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {carLoading || kilometersLoading ? (
            <div className="flex items-center justify-center gap-3 py-12">
              <CircularProgress size={24} />
              <span className="text-secondary">{t.common.loading}</span>
            </div>
          ) : chartData.length === 0 ? (
            <Panel title={t.kilometers.kilometerHistory}>
              <div className="empty-state">
                <p>{t.kilometers.noEntriesYet}</p>
                <p className="text-sm mt-1">{t.kilometers.addFirstEntry}</p>
              </div>
            </Panel>
          ) : (
            /* Chart */
            <Panel title={t.kilometers.kilometerHistory}>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{
                      top: 10,
                      right: 10,
                      left: 10,
                      bottom: 10,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={chartTheme.gridLine}
                    />
                    <XAxis
                      dataKey="timestamp"
                      type="number"
                      domain={["dataMin", "dataMax"]}
                      scale="time"
                      tickFormatter={(timestamp) => {
                        const date = new Date(timestamp);
                        return date.toLocaleDateString("en-GB", {
                          month: "short",
                          day: "numeric",
                        });
                      }}
                      stroke={chartTheme.text}
                      tick={{ fill: chartTheme.text, fontSize: 12 }}
                      tickLine={{ stroke: chartTheme.text }}
                      axisLine={{ stroke: chartTheme.gridLine }}
                    />
                    <YAxis
                      tickFormatter={(value) =>
                        new Intl.NumberFormat("de-DE").format(value)
                      }
                      stroke={chartTheme.text}
                      tick={{ fill: chartTheme.text, fontSize: 12 }}
                      tickLine={{ stroke: chartTheme.text }}
                      axisLine={{ stroke: chartTheme.gridLine }}
                      width={80}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="total_kilometers"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{
                        fill: "#3b82f6",
                        stroke: "#3b82f6",
                        strokeWidth: 2,
                        r: 4,
                      }}
                      activeDot={{
                        r: 6,
                        stroke: "#3b82f6",
                        strokeWidth: 2,
                        fill: "#fff",
                      }}
                      name={t.kilometers.totalKilometers}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          )}
        </div>
      ) : null}
    </div>
  );
}
