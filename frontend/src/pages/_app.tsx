import type { AppProps } from "next/app";
import { useEffect } from "react";
import Layout from "@/components/common/Layout";
import { AuthProvider } from "@/lib/auth";
import { AuthGuard } from "@/components/auth";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
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

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Re-apply on mount to ensure it's set
    const theme = getInitialTheme();
    const currentTheme = resolveTheme(theme);
    applyTheme(currentTheme);
  }, []);

  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <AuthGuard>
            <Layout>
              <Component {...pageProps} />
            </Layout>
          </AuthGuard>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
