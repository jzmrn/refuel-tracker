import { useEffect, useState } from "react";

/** Returns true when viewport is narrower than Tailwind's `sm` breakpoint (640px). */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    setIsHydrated(true);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Keep first client render identical to SSR output to avoid hydration mismatch.
  return isHydrated && isMobile;
}
