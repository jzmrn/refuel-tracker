import React, { useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import CircularProgress from "@mui/material/CircularProgress";
import ClearIcon from "@mui/icons-material/Close";
import { PlaceResponse } from "@/lib/api";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { MIN_PLACE_QUERY_LENGTH, usePlaceSearch } from "@/lib/hooks/usePlaces";
import { useTranslation } from "@/lib/i18n/LanguageContext";

interface PlaceAutocompleteProps {
  id?: string;
  value: PlaceResponse | null;
  onChange: (place: PlaceResponse | null) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}

/**
 * Type-ahead input for German municipalities.
 *
 * Only places returned by the backend can be selected - free text is discarded
 * as soon as the field loses focus, so the resulting coordinates always come
 * from the official dataset.
 */
export default function PlaceAutocomplete({
  id = "place",
  value,
  onChange,
  placeholder,
  disabled = false,
  required = false,
}: PlaceAutocompleteProps) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState(value?.label ?? "");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  // Always read the current selection inside the delayed blur handler
  const selectedValueRef = useRef<PlaceResponse | null>(value);
  selectedValueRef.current = value;
  // Tracks free text that has not been committed to a selection yet
  const isEditingRef = useRef(false);

  const debouncedQuery = useDebounce(inputValue, 300);
  const isTyping = inputValue !== debouncedQuery;
  const hasQuery = debouncedQuery.trim().length >= MIN_PLACE_QUERY_LENGTH;
  // The selected label is echoed back into the input, so don't re-query for it
  const isShowingSelection = value !== null && inputValue === value.label;

  const { data: places = [], isFetching } = usePlaceSearch(
    isShowingSelection ? "" : debouncedQuery,
  );

  const suggestions = useMemo(
    () => (isShowingSelection ? [] : places),
    [isShowingSelection, places],
  );

  // Echo the selection into the input when it changes from the outside,
  // but never clobber text the user is currently typing.
  useEffect(() => {
    if (!isEditingRef.current) {
      setInputValue(value?.label ?? "");
    }
  }, [value]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [suggestions]);

  // Close the suggestion list when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (place: PlaceResponse) => {
    isEditingRef.current = false;
    onChange(place);
    setInputValue(place.label);
    setIsOpen(false);
  };

  const handleClear = () => {
    isEditingRef.current = false;
    onChange(null);
    setInputValue("");
    setIsOpen(false);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    isEditingRef.current = true;
    setInputValue(event.target.value);
    setIsOpen(true);
    // Any manual edit invalidates a previous selection
    if (value) {
      onChange(null);
    }
  };

  const handleBlur = () => {
    // Reject free text: restore the last valid selection, or clear the field
    window.setTimeout(() => {
      isEditingRef.current = false;
      setInputValue(selectedValueRef.current?.label ?? "");
    }, 150);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setIsOpen(false);
      return;
    }

    if (!isOpen || suggestions.length === 0) {
      if (event.key === "ArrowDown") {
        setIsOpen(true);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex(
        (index) => (index - 1 + suggestions.length) % suggestions.length,
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      handleSelect(suggestions[highlightedIndex]);
    }
  };

  const isLoading = !isShowingSelection && hasQuery && (isFetching || isTyping);
  const showDropdown = isOpen && !disabled && inputValue.trim().length > 0;

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          id={id}
          role="combobox"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          autoComplete="off"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          required={required}
          placeholder={placeholder ?? t.fuelPrices.cityPlaceholder}
          className="input pr-10"
        />
        <div className="absolute inset-y-0 right-2 flex items-center">
          {isLoading ? (
            <CircularProgress size={16} />
          ) : (
            inputValue.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                aria-label={t.common.clear}
                className="text-secondary hover:text-primary-600"
              >
                <ClearIcon className="w-4 h-4" />
              </button>
            )
          )}
        </div>
      </div>

      {showDropdown && (
        <div className="absolute left-0 right-0 mt-1 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1 max-h-72 overflow-y-auto">
            {!hasQuery ? (
              <p className="px-4 py-2 text-sm text-secondary">
                {t.fuelPrices.cityMinChars}
              </p>
            ) : isLoading ? (
              <p className="px-4 py-2 text-sm text-secondary">
                {t.common.loading}
              </p>
            ) : suggestions.length === 0 ? (
              <p className="px-4 py-2 text-sm text-secondary">
                {t.fuelPrices.noCitiesFound}
              </p>
            ) : (
              suggestions.map((place, index) => (
                <button
                  key={place.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => handleSelect(place)}
                  className={clsx(
                    index === highlightedIndex
                      ? "btn-menu-item-active"
                      : "btn-menu-item-inactive",
                  )}
                >
                  <div className="flex flex-col items-start text-left">
                    <span className="truncate">{place.label}</span>
                    {place.state && (
                      <span className="text-xs text-secondary">
                        {place.state}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
