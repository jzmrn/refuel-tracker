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
  storageKey?: string;
}

import { useEffect, useCallback } from "react";
import {
  useFilterCollapseDefault,
  setFilterCookie,
} from "@/lib/filterCollapse";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export const FilterPanel: React.FC<FilterPanelProps> = ({
  title,
  icon,
  children,
  className = "",
  collapsedSummary = [],
  storageKey,
}) => {
  const initialCollapsed = useFilterCollapseDefault(storageKey);
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const contentRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  const handleToggle = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      if (storageKey) setFilterCookie(storageKey, next);
      return next;
    });
  }, [storageKey]);

  useIsomorphicLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    if (isFirstRender.current) {
      isFirstRender.current = false;
      // Transfer SSR class-based state to inline styles (higher specificity)
      if (collapsed) {
        el.style.maxHeight = "0px";
        el.style.opacity = "0";
        el.style.marginTop = "0px";
      } else {
        el.style.maxHeight = "none";
        el.style.opacity = "1";
        el.style.marginTop = "16px";
      }
      return;
    }

    if (collapsed) {
      // Collapsing: snapshot current expanded state, force reflow, then animate to 0
      el.style.maxHeight = `${el.scrollHeight}px`;
      el.style.opacity = "1";
      el.style.marginTop = "16px";
      void el.offsetHeight;
      el.style.maxHeight = "0px";
      el.style.opacity = "0";
      el.style.marginTop = "0px";
    } else {
      // Expanding: animate from collapsed to expanded
      el.style.maxHeight = `${el.scrollHeight}px`;
      el.style.opacity = "1";
      el.style.marginTop = "16px";
    }
  }, [collapsed]);

  const handleTransitionEnd = () => {
    if (!collapsed && contentRef.current) {
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
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          initialCollapsed ? "max-h-0 opacity-0" : "mt-4"
        }`}
      >
        <div className="space-y-4">{children}</div>
      </div>
    </StandardCard>
  );
};
