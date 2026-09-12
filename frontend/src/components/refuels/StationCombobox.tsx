import { useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import CircularProgress from "@mui/material/CircularProgress";
import ClearIcon from "@mui/icons-material/Close";
import {
  FavoriteStationDropdown,
  GasStationResponse,
  PlaceResponse,
  apiService,
} from "@/lib/api";
import { MIN_PLACE_QUERY_LENGTH, usePlaceSearch } from "@/lib/hooks/usePlaces";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { useTranslation } from "@/lib/i18n/LanguageContext";

const CITY_SEARCH_RADIUS_KM = 5;

function stationLabel(station: FavoriteStationDropdown): string {
  return `${station.brand} - ${station.street}`;
}

function toDropdown(s: GasStationResponse): FavoriteStationDropdown {
  return {
    station_id: s.id,
    brand: s.brand,
    street: s.street,
    house_number: s.house_number,
    place: s.place,
    prices: {
      e5: { value: s.e5 },
      e10: { value: s.e10 },
      diesel: { value: s.diesel },
    },
  };
}

type ListItem =
  | { kind: "station"; station: FavoriteStationDropdown }
  | { kind: "place"; place: PlaceResponse };

interface StationComboboxProps {
  id?: string;
  stations: FavoriteStationDropdown[];
  value: string | undefined;
  onChange: (station: FavoriteStationDropdown | undefined) => void;
  disabled?: boolean;
  loading?: boolean;
}

export default function StationCombobox({
  id = "station_id",
  stations,
  value,
  onChange,
  disabled = false,
  loading = false,
}: StationComboboxProps) {
  const { t } = useTranslation();
  const [extraStations, setExtraStations] = useState<FavoriteStationDropdown[]>(
    [],
  );
  const knownStations = useMemo(() => {
    const byId = new Map<string, FavoriteStationDropdown>();
    for (const s of stations) byId.set(s.station_id, s);
    for (const s of extraStations) {
      if (!byId.has(s.station_id)) byId.set(s.station_id, s);
    }
    return Array.from(byId.values());
  }, [stations, extraStations]);

  const selected = knownStations.find((s) => s.station_id === value) ?? null;
  const [inputValue, setInputValue] = useState(
    selected ? stationLabel(selected) : "",
  );
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [cityStations, setCityStations] = useState<FavoriteStationDropdown[]>(
    [],
  );
  const [searchingCity, setSearchingCity] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const isEditingRef = useRef(false);

  useEffect(() => {
    if (!isEditingRef.current) {
      setInputValue(selected ? stationLabel(selected) : "");
    }
  }, [selected]);

  const query = inputValue.trim();
  const queryLower = query.toLowerCase();
  const showingSelection =
    selected !== null && inputValue === stationLabel(selected);
  const showingCityResults = cityStations.length > 0 || searchingCity;
  const placeQuery = showingSelection || showingCityResults ? "" : query;
  const debouncedPlaceQuery = useDebounce(placeQuery, 300);
  const { data: places = [], isFetching: placesFetching } =
    usePlaceSearch(debouncedPlaceQuery);

  const localMatches = useMemo(() => {
    if (showingSelection || queryLower.length === 0) return knownStations;
    return knownStations.filter((s) =>
      `${s.brand} ${s.street} ${s.place}`.toLowerCase().includes(queryLower),
    );
  }, [knownStations, showingSelection, queryLower]);

  const showPlaces =
    !showingSelection && query.length >= MIN_PLACE_QUERY_LENGTH;
  const items: ListItem[] = useMemo(() => {
    const stationItems: ListItem[] = localMatches.map((station) => ({
      kind: "station",
      station,
    }));
    if (!showPlaces) return stationItems;
    const placeItems: ListItem[] = places.map((place) => ({
      kind: "place",
      place,
    }));
    return [...stationItems, ...placeItems];
  }, [localMatches, showPlaces, places]);

  const suggestions: ListItem[] = useMemo(() => {
    if (cityStations.length === 0) return items;
    const cityItems: ListItem[] = cityStations.map((station) => ({
      kind: "station",
      station,
    }));
    return [...cityItems, ...items];
  }, [cityStations, items]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [suggestions]);

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

  const handleSelectStation = (station: FavoriteStationDropdown) => {
    isEditingRef.current = false;
    setExtraStations((prev) =>
      prev.some((s) => s.station_id === station.station_id)
        ? prev
        : [...prev, station],
    );
    onChange(station);
    setInputValue(stationLabel(station));
    setCityStations([]);
    setIsOpen(false);
  };

  const handleSelectPlace = async (place: PlaceResponse) => {
    isEditingRef.current = true;
    setInputValue(place.label);
    setSearchingCity(true);
    setCityStations([]);
    try {
      const results = await apiService.searchGasStations({
        lat: place.lat,
        lng: place.lng,
        rad: CITY_SEARCH_RADIUS_KM,
        fuel_type: "all",
        sort_by: "dist",
        open_only: false,
      });
      setCityStations(results.map(toDropdown));
    } catch (error) {
      console.error("Error searching stations for city:", error);
      setCityStations([]);
    } finally {
      setSearchingCity(false);
    }
  };

  const handleClear = () => {
    isEditingRef.current = false;
    onChange(undefined);
    setInputValue("");
    setCityStations([]);
    setIsOpen(false);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    isEditingRef.current = true;
    setInputValue(event.target.value);
    setCityStations([]);
    setIsOpen(true);
    if (value) onChange(undefined);
  };

  const handleBlur = () => {
    window.setTimeout(() => {
      isEditingRef.current = false;
      setInputValue(
        selectedRef.current ? stationLabel(selectedRef.current) : "",
      );
      setCityStations([]);
    }, 150);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setIsOpen(false);
      return;
    }
    if (!isOpen || suggestions.length === 0) {
      if (event.key === "ArrowDown") setIsOpen(true);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((i) => (i + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex(
        (i) => (i - 1 + suggestions.length) % suggestions.length,
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      const item = suggestions[highlightedIndex];
      if (item.kind === "station") handleSelectStation(item.station);
      else handleSelectPlace(item.place);
    }
  };

  const showDropdown = isOpen && !disabled;
  const isLoadingPlaces =
    showPlaces &&
    (placesFetching || query !== debouncedPlaceQuery) &&
    !searchingCity;

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
          disabled={disabled || loading}
          placeholder={loading ? t.common.loading : t.refuels.selectStation}
          className="input pr-10"
        />
        <div className="absolute inset-y-0 right-2 flex items-center">
          {loading || searchingCity ? (
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
            {searchingCity ? (
              <p className="px-4 py-2 text-sm text-secondary">
                {t.common.loading}
              </p>
            ) : suggestions.length === 0 ? (
              <p className="px-4 py-2 text-sm text-secondary">
                {showPlaces && !isLoadingPlaces
                  ? t.fuelPrices.noCitiesFound
                  : showPlaces
                  ? t.common.loading
                  : t.fuelPrices.noResults}
              </p>
            ) : (
              suggestions.map((item, index) =>
                item.kind === "station" ? (
                  <button
                    key={`s-${item.station.station_id}`}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => handleSelectStation(item.station)}
                    className={clsx(
                      index === highlightedIndex
                        ? "btn-menu-item-active"
                        : "btn-menu-item-inactive",
                    )}
                  >
                    <div className="flex flex-col items-start text-left">
                      <span className="truncate">
                        {item.station.brand} - {item.station.street}
                        {item.station.prices ? " €" : ""}
                      </span>
                      {item.station.place && (
                        <span className="text-xs text-secondary">
                          {item.station.place}
                        </span>
                      )}
                    </div>
                  </button>
                ) : (
                  <button
                    key={`p-${item.place.id}`}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => handleSelectPlace(item.place)}
                    className={clsx(
                      index === highlightedIndex
                        ? "btn-menu-item-active"
                        : "btn-menu-item-inactive",
                    )}
                  >
                    <div className="flex flex-col items-start text-left">
                      <span className="truncate">{item.place.label}</span>
                      <span className="text-xs text-secondary">
                        {t.fuelPrices.city}
                      </span>
                    </div>
                  </button>
                ),
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
