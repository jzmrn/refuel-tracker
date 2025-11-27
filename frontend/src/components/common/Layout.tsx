import React, { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { clsx } from "clsx";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { UserProfile } from "@/components/auth";

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
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 5a2 2 0 012-2h4a2 2 0 012 2v14l-5-3-5 3V5z"
          />
        </svg>
      ),
    },
  ];

  const mainNavigation = [
    {
      name: t.navigation.refuel,
      href: "/refuels",
      shortName: t.navigation.fuel,
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
    },
    {
      name: t.navigation.dataTracking,
      href: "/data-tracking",
      shortName: t.navigation.data,
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        </svg>
      ),
    },
    {
      name: t.navigation.timeSpans,
      href: "/time-spans",
      shortName: t.navigation.time,
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      name: t.navigation.fuelPrices,
      href: "/fuel-prices",
      shortName: t.navigation.prices,
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
  ];

  const bottomNavigation = [
    {
      name: t.navigation.settings,
      href: "/settings",
      shortName: t.navigation.settings,
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
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
            const isActive = router.pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={clsx(
                  "flex flex-col items-center py-2 px-3 rounded-lg text-xs font-medium transition-colors min-w-0",
                  isActive
                    ? "bg-primary-50 text-primary-700 dark:bg-blue-900/20 dark:text-blue-300"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100",
                )}
              >
                <span className="mb-1">{item.icon}</span>
                <span className="truncate">{item.shortName}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
