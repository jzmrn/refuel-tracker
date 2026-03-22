import type { AppProps } from "next/app";
import App, { AppContext } from "next/app";
import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Layout from "@/components/common/Layout";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { parseLanguageCookie } from "@/lib/i18n/cookies";
import { Language } from "@/lib/i18n/types";
import { UserProvider } from "@/lib/auth/UserContext";
import {
  ThemeProvider,
  getInitialTheme,
  resolveTheme,
  applyTheme,
} from "@/lib/theme";
import { FuelTypeProvider, parseFuelTypeCookie } from "@/lib/fuelType";
import type { FuelType } from "@/lib/api";
import "@/styles/globals.css";

// Apply theme before first render to prevent flash
if (typeof window !== "undefined") {
  const theme = getInitialTheme();
  const currentTheme = resolveTheme(theme);
  applyTheme(currentTheme);
}

function AppContent({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Re-apply theme on mount
    const theme = getInitialTheme();
    const currentTheme = resolveTheme(theme);
    applyTheme(currentTheme);
  }, []);

  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
}

export default function MyApp(
  props: AppProps & {
    initialLanguage: Language;
    initialFuelType: FuelType;
  },
) {
  const { initialLanguage, initialFuelType, ...appProps } = props;
  // Create QueryClient instance - using useState ensures it's stable across renders
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
            gcTime: 10 * 60 * 1000, // 10 minutes - cache retention
            refetchOnWindowFocus: false, // Don't refetch when user returns to tab
            refetchOnReconnect: false, // Don't refetch on network reconnect
            retry: 1, // Retry failed requests once
          },
        },
      }),
  );

  // Implement LRU cache for station details to limit memory usage
  // Keep only the most recent 20 station queries in cache
  useEffect(() => {
    const MAX_STATION_CACHE = 20;
    const STATION_KEY_TYPES = [
      "stationMeta",
      "stationPriceHistory",
      "stationDailyStats",
    ];

    const cleanupStationCache = () => {
      const cache = queryClient.getQueryCache();
      const stationQueries = cache
        .getAll()
        .filter((query) => {
          const key = query.queryKey;
          return (
            Array.isArray(key) &&
            key[0] === "fuelPrices" &&
            typeof key[1] === "string" &&
            STATION_KEY_TYPES.includes(key[1])
          );
        })
        .sort((a, b) => {
          // Sort by last update time (most recent first)
          const timeA = a.state.dataUpdatedAt || 0;
          const timeB = b.state.dataUpdatedAt || 0;
          return timeB - timeA;
        });

      // Remove oldest entries if we exceed the limit
      if (stationQueries.length > MAX_STATION_CACHE) {
        const toRemove = stationQueries.slice(MAX_STATION_CACHE);
        toRemove.forEach((query) => {
          queryClient.removeQueries({ queryKey: query.queryKey });
        });
      }
    };

    // Run cleanup when cache changes
    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      cleanupStationCache();
    });

    return () => unsubscribe();
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider initialLanguage={initialLanguage}>
          <FuelTypeProvider initialFuelType={initialFuelType}>
            <UserProvider>
              <AppContent {...appProps} />
            </UserProvider>
          </FuelTypeProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

MyApp.getInitialProps = async (appContext: AppContext) => {
  const appProps = await App.getInitialProps(appContext);
  const cookies = appContext.ctx.req?.headers.cookie;
  const initialLanguage = parseLanguageCookie(cookies);
  const initialFuelType = parseFuelTypeCookie(cookies);
  return { ...appProps, initialLanguage, initialFuelType };
};
