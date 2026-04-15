import Link from "next/link";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import AssessmentIcon from "@mui/icons-material/Assessment";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import LocalGasStationIcon from "@mui/icons-material/LocalGasStation";
import { PageContainer, PageHeader } from "@/components/common";

export default function Dashboard() {
  const { t } = useTranslation();

  const features = [
    {
      name: t.navigation.fuelPrices,
      description: t.dashboard.features.fuelPricesDescription,
      href: "/stations",
      icon: LocalGasStationIcon,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
    },
    {
      name: t.navigation.cars,
      description: t.dashboard.features.refuelDescription,
      href: "/cars",
      icon: DirectionsCarIcon,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      name: t.navigation.statistics,
      description: t.dashboard.features.statisticsDescription,
      href: "/stats",
      icon: AssessmentIcon,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
  ];

  return (
    <PageContainer>
      <PageHeader title={t.navigation.dashboard} />

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
    </PageContainer>
  );
}
