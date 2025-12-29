import type { AppProps } from "next/app";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Layout from "@/components/common/Layout";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { UserProvider } from "@/lib/auth/UserContext";
import {
  ThemeProvider,
  getInitialTheme,
  resolveTheme,
  applyTheme,
} from "@/lib/theme";
import "@/styles/globals.css";

// Apply theme before first render to prevent flash
if (typeof window !== "undefined") {
  const theme = getInitialTheme();
  const currentTheme = resolveTheme(theme);
  applyTheme(currentTheme);
}

function AppContent({ Component, pageProps }: AppProps) {
  const router = useRouter();

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

export default function App(props: AppProps) {
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
  // Keep only the most recent 20 station details in cache
  useEffect(() => {
    const MAX_STATION_DETAILS_CACHE = 20;

    const cleanupStationDetailsCache = () => {
      const cache = queryClient.getQueryCache();
      const stationDetailsQueries = cache
        .getAll()
        .filter((query) => {
          const key = query.queryKey;
          return (
            Array.isArray(key) &&
            key[0] === "fuelPrices" &&
            key[1] === "stationDetails"
          );
        })
        .sort((a, b) => {
          // Sort by last update time (most recent first)
          const timeA = a.state.dataUpdatedAt || 0;
          const timeB = b.state.dataUpdatedAt || 0;
          return timeB - timeA;
        });

      // Remove oldest entries if we exceed the limit
      if (stationDetailsQueries.length > MAX_STATION_DETAILS_CACHE) {
        const toRemove = stationDetailsQueries.slice(MAX_STATION_DETAILS_CACHE);
        toRemove.forEach((query) => {
          queryClient.removeQueries({ queryKey: query.queryKey });
        });
      }
    };

    // Run cleanup when cache changes
    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      cleanupStationDetailsCache();
    });

    return () => unsubscribe();
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <UserProvider>
            <AppContent {...props} />
          </UserProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
