import React, { createContext, useContext } from "react";

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

/**
 * Returns the collapse state for a filter key.
 * Always uses server state (from cookies via getInitialProps) to avoid hydration mismatches.
 * Returns true (collapsed) by default if no cookie was set.
 */
export function useFilterCollapseDefault(key: string | undefined): boolean {
  const serverState = useContext(FilterCollapseContext);
  if (!key) return true;
  return serverState[key] ?? true;
}
