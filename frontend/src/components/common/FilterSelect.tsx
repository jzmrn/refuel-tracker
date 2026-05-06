import React, { useState, useRef, useEffect } from "react";
import { clsx } from "clsx";
import CheckIcon from "@mui/icons-material/Check";

interface FilterSelectOption {
  value: string;
  label: string;
}

interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: FilterSelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * A styled custom dropdown component for use within FilterRow/FilterPanel.
 * Uses the same styling as LanguageSwitcher and ThemeSelector.
 */
export const FilterSelect: React.FC<FilterSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = "All",
  className = "",
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
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
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => {
        document.removeEventListener("keydown", handleEscape);
      };
    }
  }, [isOpen]);

  const handleSelect = (newValue: string) => {
    onChange(newValue);
    setIsOpen(false);
  };

  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption?.label || placeholder;

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
          <div className="py-1 max-h-80 overflow-y-auto">
            {/* Placeholder / "All" option */}
            <button
              type="button"
              onClick={() => handleSelect("")}
              className={clsx(
                !value ? "btn-menu-item-active" : "btn-menu-item-inactive",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="truncate">{placeholder}</span>
                {!value && (
                  <CheckIcon className="w-4 h-4 text-primary-600 dark:text-blue-400 flex-shrink-0" />
                )}
              </div>
            </button>

            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={clsx(
                  value === option.value
                    ? "btn-menu-item-active"
                    : "btn-menu-item-inactive",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate">{option.label}</span>
                  {value === option.value && (
                    <CheckIcon className="w-4 h-4 text-primary-600 dark:text-blue-400 flex-shrink-0" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterSelect;
