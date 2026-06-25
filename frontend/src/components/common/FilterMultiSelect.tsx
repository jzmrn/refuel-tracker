import React, { useState, useRef, useEffect, useMemo } from "react";
import { clsx } from "clsx";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import SearchIcon from "@mui/icons-material/Search";

export interface FilterMultiSelectOption {
  value: string;
  label: string;
}

interface FilterMultiSelectProps {
  values: string[];
  onChange: (values: string[]) => void;
  options: FilterMultiSelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  searchable?: boolean;
  selectAllLabel?: string;
  deselectAllLabel?: string;
  selectedLabel?: (count: number) => string;
}

/**
 * A multi-select dropdown with checkboxes, matching FilterSelect design.
 * Supports search filtering and select all/deselect all actions.
 */
export const FilterMultiSelect: React.FC<FilterMultiSelectProps> = ({
  values,
  onChange,
  options,
  placeholder = "Select...",
  className = "",
  disabled = false,
  searchable = true,
  selectAllLabel = "Select all",
  deselectAllLabel = "Deselect all",
  selectedLabel = (count) => `${count} selected`,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearch("");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        setSearch("");
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => {
        document.removeEventListener("keydown", handleEscape);
      };
    }
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  const filteredOptions = useMemo(() => {
    if (!search) return options;
    const lower = search.toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(lower));
  }, [options, search]);

  const valuesSet = useMemo(() => new Set(values), [values]);

  const handleToggle = (value: string) => {
    if (valuesSet.has(value)) {
      onChange(values.filter((v) => v !== value));
    } else {
      onChange([...values, value]);
    }
  };

  const handleSelectAll = () => {
    onChange(options.map((o) => o.value));
  };

  const handleDeselectAll = () => {
    onChange([]);
  };

  const displayLabel =
    values.length === 0
      ? placeholder
      : values.length === options.length
      ? placeholder
      : selectedLabel(values.length);

  return (
    <div
      className={clsx("relative sm:min-w-[300px]", className)}
      ref={dropdownRef}
    >
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={clsx(
          "btn-dropdown w-full justify-between",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        <span className="truncate">{displayLabel}</span>
        <svg
          className={clsx(
            "w-4 h-4 transition-transform flex-shrink-0",
            isOpen ? "rotate-180" : "rotate-0",
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 left-0 mt-1 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50">
          {/* Search input */}
          {searchable && (
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>
          )}

          {/* Select all / Deselect all */}
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-xs text-primary-600 dark:text-blue-400 hover:underline"
            >
              {selectAllLabel}
            </button>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <button
              type="button"
              onClick={handleDeselectAll}
              className="text-xs text-primary-600 dark:text-blue-400 hover:underline"
            >
              {deselectAllLabel}
            </button>
          </div>

          {/* Options list */}
          <div className="py-1 max-h-64 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-secondary">
                No results found
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = valuesSet.has(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleToggle(option.value)}
                    className={clsx(
                      "w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors",
                      isSelected ? "text-primary" : "text-secondary",
                    )}
                  >
                    {isSelected ? (
                      <CheckBoxIcon className="w-4 h-4 text-primary-600 dark:text-blue-400 flex-shrink-0" />
                    ) : (
                      <CheckBoxOutlineBlankIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                    <span className="truncate">{option.label}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterMultiSelect;
