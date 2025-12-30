import React, { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { clsx } from "clsx";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { UserProfile } from "@/components/auth";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import LocalGasStationIcon from "@mui/icons-material/LocalGasStation";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import SettingsIcon from "@mui/icons-material/Settings";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const { t } = useTranslation();

  const desktopExclusive = [
    {
      name: t.navigation.dashboard,
      href: "/",
      shortName: t.navigation.home,
      icon: <DashboardIcon className="w-5 h-5" />,
    },
  ];

  const mainNavigation = [
    {
      name: t.navigation.fuelPrices,
      href: "/fuel-prices",
      shortName: t.navigation.prices,
      icon: <AttachMoneyIcon className="w-5 h-5" />,
    },
    {
      name: t.navigation.refuel,
      href: "/refuels",
      shortName: t.navigation.refuel,
      icon: <LocalGasStationIcon className="w-5 h-5" />,
    },
    {
      name: t.navigation.dataTracking,
      href: "/data-tracking",
      shortName: t.navigation.data,
      icon: <TrendingUpIcon className="w-5 h-5" />,
    },
    {
      name: t.navigation.timeSpans,
      href: "/time-spans",
      shortName: t.navigation.time,
      icon: <AccessTimeIcon className="w-5 h-5" />,
    },
  ];

  const bottomNavigation = [
    {
      name: t.navigation.settings,
      href: "/settings",
      shortName: t.navigation.more,
      icon: <SettingsIcon className="w-5 h-5" />,
    },
  ];

  const desktopNavigation = [...desktopExclusive, ...mainNavigation];
  const mobileNavigation = [...mainNavigation, ...bottomNavigation];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 md:flex">
      {/* Desktop Sidebar - Hidden on mobile */}
      <div className="hidden md:flex md:flex-col w-64 bg-white dark:bg-gray-800 shadow-sm border-r border-gray-200 dark:border-gray-700 h-screen sticky top-0">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {t.layout.appTitle}
            </h1>
            <UserProfile />
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 px-3">
          <ul className="space-y-1">
            {desktopNavigation.map((item) => {
              const isActive =
                router.pathname === item.href ||
                (item.href === "/fuel-prices" &&
                  router.pathname.startsWith("/fuel-prices/")) ||
                (item.href === "/refuels" &&
                  router.pathname.startsWith("/refuels/"));
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={clsx(
                      "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary-50 text-primary-700 border-r-2 border-primary-700 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-300"
                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100",
                    )}
                  >
                    <span className="mr-3">{item.icon}</span>
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom Navigation */}
        <nav className="px-3 pb-4">
          <ul className="space-y-1">
            {bottomNavigation.map((item) => {
              const isActive = router.pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={clsx(
                      "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary-50 text-primary-700 border-r-2 border-primary-700 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-300"
                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100",
                    )}
                  >
                    <span className="mr-3">{item.icon}</span>
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col md:overflow-hidden">
        <main className="flex-1 p-1 md:p-6 pb-20 md:pb-8 md:overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation - Visible only on mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-2 py-1">
        <nav className="flex justify-around">
          {mobileNavigation.map((item) => {
            const isActive =
              router.pathname === item.href ||
              (item.href === "/fuel-prices" &&
                router.pathname.startsWith("/fuel-prices/")) ||
              (item.href === "/refuels" &&
                router.pathname.startsWith("/refuels/"));
            return (
              <Link
                key={item.name}
                href={item.href}
                className="flex flex-1 flex-col items-center py-2 px-1 min-w-0"
              >
                <div
                  className={clsx(
                    "flex flex-col items-center py-1.5 px-2 rounded-lg text-xs font-medium transition-colors",
                    isActive
                      ? "bg-primary-50 text-primary-700 dark:bg-blue-900/20 dark:text-blue-300"
                      : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100",
                  )}
                >
                  <span className="mb-1">{item.icon}</span>
                  <span className="truncate">{item.shortName}</span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
