import React, { useState, useRef, useLayoutEffect } from "react";
import { StandardCard } from "./StandardCard";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";

interface FilterCardProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

export const FilterCard: React.FC<FilterCardProps> = ({
  label,
  children,
  className = "",
}) => {
  return (
    <div className={`panel p-4 ${className}`}>
      <FilterRow label={label}>{children}</FilterRow>
    </div>
  );
};

interface FilterRowProps {
  label: string;
  children: React.ReactNode;
}

export const FilterRow: React.FC<FilterRowProps> = ({ label, children }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0">
        {label}
      </label>
      {children}
    </div>
  );
};

interface FilterPanelProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  collapsedSummary?: string[];
}

import { useEffect } from "react";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export const FilterPanel: React.FC<FilterPanelProps> = ({
  title,
  icon,
  children,
  className = "",
  collapsedSummary = [],
}) => {
  const [collapsed, setCollapsed] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  const handleToggle = () => setCollapsed((c) => !c);

  useIsomorphicLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    if (isFirstRender.current) {
      isFirstRender.current = false;
      // Set initial collapsed state without animation
      if (collapsed) {
        el.style.maxHeight = "0px";
      }
      return;
    }

    if (collapsed) {
      // Collapsing: snapshot current height, force reflow, then animate to 0
      el.style.maxHeight = `${el.scrollHeight}px`;
      void el.offsetHeight;
      el.style.maxHeight = "0px";
    } else {
      // Expanding: animate from 0 to scrollHeight
      el.style.maxHeight = `${el.scrollHeight}px`;
    }
  }, [collapsed]);

  const handleTransitionEnd = () => {
    if (!collapsed && contentRef.current) {
      // After expand animation, remove fixed maxHeight so content can resize freely
      contentRef.current.style.maxHeight = "none";
    }
  };

  const summaryLabels = collapsed
    ? collapsedSummary.map((label, i) => (
        <span
          key={i}
          className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md"
        >
          {label}
        </span>
      ))
    : null;

  const collapseButton = (
    <div className="flex items-center gap-2">
      {summaryLabels && (
        <div className="hidden xs:flex items-center gap-2">{summaryLabels}</div>
      )}
      <button
        onClick={handleToggle}
        className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label={collapsed ? "Expand filters" : "Collapse filters"}
      >
        {collapsed ? (
          <ExpandMoreIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        ) : (
          <ExpandLessIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        )}
      </button>
    </div>
  );

  return (
    <StandardCard
      title={title}
      icon={icon}
      iconBackground="gray"
      className={className}
      headerAction={collapseButton}
      noHeaderMargin
    >
      {summaryLabels && (
        <div className="flex xs:hidden flex-wrap gap-2 mt-3">
          {summaryLabels}
        </div>
      )}
      <div
        ref={contentRef}
        onTransitionEnd={handleTransitionEnd}
        style={{
          opacity: collapsed ? 0 : 1,
          marginTop: collapsed ? 0 : 16,
        }}
        className="transition-all duration-300 ease-in-out overflow-hidden"
      >
        <div className="space-y-4">{children}</div>
      </div>
    </StandardCard>
  );
};
