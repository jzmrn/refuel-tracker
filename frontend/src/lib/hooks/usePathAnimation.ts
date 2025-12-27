import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";

export type AnimationDirection = "left" | "right" | null;

interface PathAnimationOptions {
  /**
   * The current path of the page
   */
  currentPath: string;
  /**
   * Whether to disable animations entirely
   */
  disableAnimations?: boolean;
}

/**
 * Hook to manage smart path-based page animations.
 * 
 * Animation rules:
 * - Going from higher level to lower level (e.g., /fuel-prices to /fuel-prices/search):
 *   Animates out to the left, new content fades in from the right
 * - Going from lower level to higher level (e.g., /fuel-prices/search to /fuel-prices):
 *   Animates out to the right, new content fades in from the left
 * - Skipping levels works the same (e.g., /fuel-prices to /fuel-prices/search/station/123)
 * - Switching to unrelated paths (no common base): no animation
 */
export function usePathAnimation({
  currentPath,
  disableAnimations = false,
}: PathAnimationOptions) {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(true);
  const [animationDirection, setAnimationDirection] =
    useState<AnimationDirection>(null);
  const previousPathRef = useRef<string | null>(null);

  // Calculate animation direction based on path hierarchy
  const calculateAnimationDirection = (
    fromPath: string,
    toPath: string
  ): AnimationDirection => {
    if (disableAnimations) return null;

    // Normalize paths by removing trailing slashes and query params
    const normalizePath = (path: string) => {
      return path.split("?")[0].replace(/\/$/, "") || "/";
    };

    const from = normalizePath(fromPath);
    const to = normalizePath(toPath);

    // Split paths into segments
    const fromSegments = from.split("/").filter(Boolean);
    const toSegments = to.split("/").filter(Boolean);

    // Find common base path
    let commonSegments = 0;
    const minLength = Math.min(fromSegments.length, toSegments.length);

    for (let i = 0; i < minLength; i++) {
      if (fromSegments[i] === toSegments[i]) {
        commonSegments++;
      } else {
        break;
      }
    }

    // If no common segments, paths are unrelated - no animation
    if (commonSegments === 0) {
      return null;
    }

    // If paths are the same, no animation
    if (from === to) {
      return null;
    }

    // Determine direction based on depth
    // Going deeper (more segments) = going to lower level = animate left
    // Going shallower (fewer segments) = going to higher level = animate right
    if (toSegments.length > fromSegments.length) {
      // Going to a deeper path (lower level)
      return "left"; // Current page slides left, new page comes from right
    } else if (toSegments.length < fromSegments.length) {
      // Going to a shallower path (higher level)
      return "right"; // Current page slides right, new page comes from left
    } else {
      // Same depth but different paths (sibling pages)
      // Compare the first different segment to determine order
      for (let i = commonSegments; i < minLength; i++) {
        if (fromSegments[i] !== toSegments[i]) {
          // Use alphabetical order as a heuristic
          return fromSegments[i] < toSegments[i] ? "left" : "right";
        }
      }
      return null;
    }
  };

  // Set up animation on mount and route changes
  useEffect(() => {
    if (!router.isReady) return;

    // Get the previous path from storage
    const storedPrevPath =
      typeof window !== "undefined"
        ? sessionStorage.getItem("pathAnimation.previousPath")
        : null;

    if (storedPrevPath && storedPrevPath !== currentPath) {
      // Calculate direction for entrance animation
      const direction = calculateAnimationDirection(storedPrevPath, currentPath);
      setAnimationDirection(direction);
    } else {
      // First visit or same page - no animation
      setAnimationDirection(null);
    }

    // Make page visible
    setIsVisible(true);

    // Store current path for next navigation
    previousPathRef.current = currentPath;
    if (typeof window !== "undefined") {
      sessionStorage.setItem("pathAnimation.previousPath", currentPath);
    }
  }, [router.asPath, router.isReady, currentPath, disableAnimations]); // Watch for route changes

  /**
   * Navigate to a new path with animation
   */
  const navigateWithAnimation = (targetPath: string) => {
    if (disableAnimations) {
      router.push(targetPath);
      return;
    }

    // Calculate exit animation direction
    const direction = calculateAnimationDirection(currentPath, targetPath);
    setAnimationDirection(direction);
    setIsVisible(false);

    // Store paths for the next page
    if (typeof window !== "undefined") {
      sessionStorage.setItem("pathAnimation.previousPath", currentPath);
    }

    // Wait for exit animation, then navigate
    setTimeout(() => {
      router.push(targetPath);
    }, 300);
  };

  /**
   * Navigate back with animation
   */
  const navigateBackWithAnimation = () => {
    if (disableAnimations) {
      router.back();
      return;
    }

    // Since we're going back, we're likely going to a higher level (shallower path)
    // We'll let the browser's back button handle the navigation,
    // but we set up the exit animation
    
    // Guess the direction based on current path depth
    // Going back usually means going to a shallower path
    setAnimationDirection("right");
    setIsVisible(false);

    // Store current path so the previous page knows where we came from
    if (typeof window !== "undefined") {
      sessionStorage.setItem("pathAnimation.previousPath", currentPath);
    }

    setTimeout(() => {
      router.back();
    }, 300);
  };

  return {
    isVisible,
    animationDirection,
    navigateWithAnimation,
    navigateBackWithAnimation,
  };
}
