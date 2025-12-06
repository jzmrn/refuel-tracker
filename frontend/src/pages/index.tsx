import Link from "next/link";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import BarChartIcon from "@mui/icons-material/BarChart";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import AssessmentIcon from "@mui/icons-material/Assessment";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";

export default function Dashboard() {
  const { t } = useTranslation();

  const features = [
    {
      name: t.navigation.refuel,
      description: t.dashboard.features.refuelDescription,
      href: "/refuels",
      icon: LocalShippingIcon,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      name: t.navigation.dataTracking,
      description: t.dashboard.features.dataTrackingDescription,
      href: "/data-tracking",
      icon: BarChartIcon,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      name: t.navigation.timeSpans,
      description: t.dashboard.features.timeSpansDescription,
      href: "/time-spans",
      icon: AccessTimeIcon,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      name: t.navigation.fuelPrices,
      description: t.dashboard.features.fuelPricesDescription,
      href: "/fuel-prices",
      icon: AttachMoneyIcon,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 md:py-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
          {t.navigation.dashboard}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300 text-sm md:text-base">
          {t.dashboard.welcome}
        </p>
      </div>

      {/* Getting Started */}
      <div className="mb-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 p-6">
        <div className="flex items-center">
          <AssessmentIcon className="h-10 w-10 flex-shrink-0 text-blue-600 dark:text-blue-400" />
          <div className="ml-4">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
              {t.dashboard.gettingStartedTitle}
            </h3>
            <p className="mt-2 text-sm text-blue-700 dark:text-blue-300">
              {t.dashboard.gettingStartedDescription}
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
