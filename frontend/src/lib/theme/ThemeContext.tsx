import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  startTransition,
} from "react";
import { setThemeCookie, THEME_COOKIE_KEY, parseThemeCookie } from "./cookies";

export type ResolvedTheme = "light" | "dark";
export type Theme = ResolvedTheme | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  currentTheme: ResolvedTheme; // The actual theme being applied (resolved from system if needed)
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = "refuel-tracker-theme";

// Helper function to get the initial theme synchronously
export function getInitialTheme(): Theme {
  if (typeof window === "undefined") {
    return "system";
  }
  try {
    const savedTheme = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (savedTheme && ["light", "dark", "system"].includes(savedTheme)) {
      return savedTheme;
    }
  } catch (error) {
    console.warn("Failed to load theme from localStorage:", error);
  }
  // Fall back to cookie
  return parseThemeCookie(document.cookie);
}

// Helper function to resolve the actual theme
export function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === "system") {
    if (typeof window === "undefined") {
      return "light";
    }
    const systemPrefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    return systemPrefersDark ? "dark" : "light";
  }
  return theme;
}

// Apply theme to document synchronously
export function applyTheme(currentTheme: ResolvedTheme) {
  if (typeof window === "undefined") {
    return;
  }
  const root = document.documentElement;
  if (currentTheme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>("system");
  const [currentTheme, setCurrentTheme] = useState<ResolvedTheme>(() =>
    resolveTheme("system"),
  );

  // On mount: resolve theme from cookie or localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const fromCookie = parseThemeCookie(document.cookie);

    const isValidTheme = (v: string): v is Theme =>
      ["light", "dark", "system"].includes(v);
    const resolved = stored && isValidTheme(stored) ? stored : fromCookie;

    // Sync cookie if needed
    if (
      stored &&
      isValidTheme(stored) &&
      !document.cookie.includes(THEME_COOKIE_KEY)
    ) {
      setThemeCookie(resolved);
    }

    if (resolved !== "system") {
      startTransition(() => {
        setTheme(resolved);
        setCurrentTheme(resolveTheme(resolved));
      });
    }
  }, []);

  // Update current theme when theme or system preference changes
  useEffect(() => {
    const resolved = resolveTheme(theme);
    applyTheme(resolved);
    startTransition(() => setCurrentTheme(resolved));

    // Listen for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === "system") {
        const newResolved = e.matches ? "dark" : "light";
        applyTheme(newResolved);
        startTransition(() => setCurrentTheme(newResolved));
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  // Apply theme to document when currentTheme changes
  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);

  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    setThemeCookie(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch (error) {
      console.warn("Failed to save theme to localStorage:", error);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme: handleSetTheme,
        currentTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
