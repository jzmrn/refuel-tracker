import type { AppProps } from "next/app";
import { useEffect } from "react";
import { useRouter } from "next/router";
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
  return (
    <ThemeProvider>
      <LanguageProvider>
        <UserProvider>
          <AppContent {...props} />
        </UserProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
