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
