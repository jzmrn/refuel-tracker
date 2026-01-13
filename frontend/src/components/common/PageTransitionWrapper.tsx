import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/router";

interface PageTransitionWrapperProps {
  children: ReactNode;
}

/**
 * Global page transition wrapper using Framer Motion.
 * Wrap your page content in _app.tsx to enable smooth transitions.
 *
 * Uses a simple fade transition that works reliably without
 * complex directional logic.
 */
export default function PageTransitionWrapper({
  children,
}: PageTransitionWrapperProps) {
  const router = useRouter();

  // Use pathname without query params as key to avoid
  // re-animating when only query params change
  const pageKey = router.asPath.split("?")[0];

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pageKey}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{
          duration: 0.15,
          ease: "easeInOut",
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
