import React, { createContext, useContext } from "react";
import { FILTER_COOKIE_PREFIX } from "./cookies";

type FilterCollapseState = Record<string, boolean>;

const FilterCollapseContext = createContext<FilterCollapseState>({});

export const FilterCollapseProvider: React.FC<{
  initialState: FilterCollapseState;
  children: React.ReactNode;
}> = ({ initialState, children }) => (
  <FilterCollapseContext.Provider value={initialState}>
    {children}
  </FilterCollapseContext.Provider>
);

/** Returns true (collapsed) by default if no cookie was set. */
export function useFilterCollapseDefault(key: string | undefined): boolean {
  const serverState = useContext(FilterCollapseContext);
  if (!key) return true;

  // On the client, read the current cookie (may have been updated since SSR)
  if (typeof document !== "undefined") {
    const name = `${FILTER_COOKIE_PREFIX}${key}`;
    const match = document.cookie
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${name}=`));
    if (match) {
      const value = match.split("=")[1];
      if (value === "0") return false;
      if (value === "1") return true;
    }
  }

  return serverState[key] ?? true;
}
