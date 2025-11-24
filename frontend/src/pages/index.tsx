import Link from "next/link";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import {
  ChartBarIcon,
  ClockIcon,
  DocumentChartBarIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";

export default function Dashboard() {
  const { t } = useTranslation();

  const features = [
    {
      name: t.navigation.refuel,
      description: "Track fuel consumption, prices, and costs",
      href: "/refuels",
      icon: TruckIcon,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      name: t.navigation.dataTracking,
      description: "Monitor numerical data with custom labels",
      href: "/data-tracking",
      icon: ChartBarIcon,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      name: t.navigation.timeSpans,
      description: "Log activities and time periods",
      href: "/time-spans",
      icon: ClockIcon,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8 md:mb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100">
          {t.navigation.dashboard}
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mt-4 text-lg">
          {t.dashboard.welcome}
        </p>
      </div>

      {/* Getting Started */}
      <div className="mb-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 p-6">
        <div className="flex items-center">
          <DocumentChartBarIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          <div className="ml-4">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
              Getting Started
            </h3>
            <p className="mt-2 text-sm text-blue-700 dark:text-blue-300">
              Choose a tracking category below to begin monitoring your personal
              data. Each section provides specialized tools for different types
              of information.
            </p>
          </div>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {features.map((feature) => (
          <Link
            key={feature.name}
            href={feature.href}
            className="group relative rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-6 hover:shadow-lg transition-shadow duration-200"
          >
            <div className="flex items-center">
              <div
                className={`rounded-lg ${feature.bgColor} dark:bg-gray-700 p-3`}
              >
                <feature.icon
                  className={`h-6 w-6 ${feature.color} dark:text-gray-300`}
                  aria-hidden="true"
                />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  {feature.name}
                </h3>
              </div>
            </div>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              {feature.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
