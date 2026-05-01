import React, { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { clsx } from "clsx";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { UserProfile } from "@/components/auth";
import LocalGasStationIcon from "@mui/icons-material/LocalGasStation";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import SettingsIcon from "@mui/icons-material/Settings";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const { t } = useTranslation();

  const mainNavigation = [
    {
      name: t.navigation.fuelPrices,
      href: "/prices",
      shortName: t.navigation.prices,
      icon: <LocalGasStationIcon className="w-5 h-5" />,
    },
    {
      name: t.navigation.cars,
      href: "/cars",
      shortName: t.navigation.cars,
      icon: <DirectionsCarIcon className="w-5 h-5" />,
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

  const mobileNavigation = [...mainNavigation, ...bottomNavigation];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Desktop Top Navigation - Hidden on mobile */}
      <header className="hidden md:block fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm shadow-md">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center h-16">
            {/* Left: App Title */}
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {t.layout.appTitle}
              </h1>
            </div>

            {/* Center: Navigation Items */}
            <nav className="flex items-center gap-2">
              {mainNavigation.map((item) => {
                const isActive =
                  router.pathname === item.href ||
                  (item.href === "/prices" &&
                    router.pathname.startsWith("/prices/")) ||
                  (item.href === "/cars" &&
                    router.pathname.startsWith("/cars/"));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={clsx(
                      "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary-100 text-primary-700 dark:bg-blue-900/30 dark:text-blue-300"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100",
                    )}
                  >
                    {item.icon}
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Right: Profile Picture */}
            <div className="flex-1 flex justify-end">
              <Link
                href="/settings"
                className="hover:opacity-80 transition-opacity"
              >
                <UserProfile />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col md:pt-16">
        <main className="flex-1 p-1 md:p-0 pb-20 md:pb-8">{children}</main>
      </div>

      {/* Mobile Bottom Navigation - Visible only on mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-2 py-1">
        <nav className="flex justify-around">
          {mobileNavigation.map((item) => {
            const isActive =
              router.pathname === item.href ||
              (item.href === "/prices" &&
                router.pathname.startsWith("/prices/")) ||
              (item.href === "/cars" && router.pathname.startsWith("/cars/"));
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
