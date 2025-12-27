import { ReactNode } from "react";
import { AnimationDirection } from "@/lib/hooks/usePathAnimation";

interface PageTransitionProps {
  children: ReactNode;
  isVisible: boolean;
  animationDirection: AnimationDirection;
  className?: string;
}

/**
 * Wrapper component that applies path-based page transition animations
 */
export default function PageTransition({
  children,
  isVisible,
  animationDirection,
  className = "",
}: PageTransitionProps) {
  // Determine which animation to apply
  const getAnimation = () => {
    if (!animationDirection) return "none";

    if (isVisible) {
      // Entrance animations
      return animationDirection === "right"
        ? "fadeInFromRight"
        : "fadeInFromLeft";
    } else {
      // Exit animations
      return animationDirection === "right"
        ? "fadeOutToRight"
        : "fadeOutToLeft";
    }
  };

  return (
    <>
      <style jsx>{`
        .page-transition-container {
          animation: ${getAnimation()} 0.3s ease-out;
          animation-fill-mode: both;
        }

        @keyframes fadeInFromRight {
          from {
            opacity: 0;
            transform: translateX(40px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes fadeInFromLeft {
          from {
            opacity: 0;
            transform: translateX(-40px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes fadeOutToRight {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(40px);
          }
        }

        @keyframes fadeOutToLeft {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(-40px);
          }
        }
      `}</style>

      <div className={`page-transition-container ${className}`}>{children}</div>
    </>
  );
}
