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
 * Uses mode="popLayout" to keep both old and new pages in DOM during
 * transition, preventing scroll position jumps. The old page fades out
 * while the new page fades in simultaneously.
 */
export default function PageTransitionWrapper({
  children,
}: PageTransitionWrapperProps) {
  const router = useRouter();

  // Use pathname without query params as key to avoid
  // re-animating when only query params change
  const pageKey = router.asPath.split("?")[0];

  return (
    <AnimatePresence mode="popLayout" initial={false}>
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
