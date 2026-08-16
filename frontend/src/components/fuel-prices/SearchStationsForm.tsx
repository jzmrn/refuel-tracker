import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import {
  GasStationSearchRequest,
  GasStationResponse,
  PlaceResponse,
} from "@/lib/api";
import { StandardForm } from "@/components/common/StandardForm";
import PlaceAutocomplete from "@/components/common/PlaceAutocomplete";
import { usePlace } from "@/lib/hooks/usePlaces";
import CircularProgress from "@mui/material/CircularProgress";

export interface StationSearchParams {
  sortBy: string;
  lat: number;
  lng: number;
  rad: number;
  placeId?: string;
}

interface SearchStationsFormProps {
  onSearch: (
    results: GasStationResponse[],
    searchParams: StationSearchParams,
  ) => void;
  onError: (error: string) => void;
  isSubmitting?: boolean;
  initialValues?: {
    lat?: number;
    lng?: number;
    rad?: number;
    sortBy?: string;
    placeId?: string;
  };
}

export default function SearchStationsForm({
  onSearch,
  onError,
  isSubmitting = false,
  initialValues,
}: SearchStationsFormProps) {
  const { t } = useTranslation();
  const [selectedPlace, setSelectedPlace] = useState<PlaceResponse | null>(
    null,
  );
  const [latitude, setLatitude] = useState(
    initialValues?.lat?.toString() || "",
  );
  const [longitude, setLongitude] = useState(
    initialValues?.lng?.toString() || "",
  );
  const [radius, setRadius] = useState(initialValues?.rad?.toString() || "5");
  const [isSearching, setIsSearching] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Restore the previously selected city when returning to the form via URL
  const { data: initialPlace } = usePlace(initialValues?.placeId);

  useEffect(() => {
    if (initialPlace) {
      setSelectedPlace(initialPlace);
    }
  }, [initialPlace]);

  const handlePlaceChange = (place: PlaceResponse | null) => {
    setSelectedPlace(place);
    if (place) {
      setLatitude(place.lat.toFixed(6));
      setLongitude(place.lng.toFixed(6));
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      onError(t.fuelPrices.locationNotSupported);
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Coordinates no longer belong to the selected city
        setSelectedPlace(null);
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setIsGettingLocation(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        onError(t.fuelPrices.locationPermissionDenied);
        setIsGettingLocation(false);
      },
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!latitude || !longitude) {
      onError(t.fuelPrices.cityRequired);
      return;
    }
    if (!radius) {
      onError(t.fuelPrices.radiusRequired);
      return;
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const rad = parseFloat(radius);

    if (
      isNaN(lat) ||
      isNaN(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      onError(t.fuelPrices.invalidCoordinates);
      return;
    }

    setIsSearching(true);

    try {
      const { default: apiService } = await import("@/lib/api");
      const searchParams: GasStationSearchRequest = {
        lat,
        lng,
        rad,
        fuel_type: "all",
        sort_by: "dist",
        open_only: false,
      };

      const results = await apiService.searchGasStations(searchParams);
      onSearch(results, {
        sortBy: "dist",
        lat,
        lng,
        rad,
        placeId: selectedPlace?.id,
      });
    } catch (error) {
      console.error("Search error:", error);
      onError(t.fuelPrices.failedToSearch);
    } finally {
      setIsSearching(false);
    }
  };

  const isLoading = isSearching || isSubmitting;

  const formActions = (
    <button type="submit" disabled={isLoading} className="btn-primary w-full">
      {isLoading ? (
        <span className="flex items-center justify-center gap-2">
          <CircularProgress size={20} sx={{ color: "white" }} />
          {t.common.loading}
        </span>
      ) : (
        t.fuelPrices.search
      )}
    </button>
  );

  return (
    <StandardForm
      onSubmit={handleSubmit}
      actions={formActions}
      containerClass="panel"
      className="max-w-3xl mx-auto"
    >
      {/* Section: Search by City */}
      <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300">
        {t.fuelPrices.searchByCity}
      </h3>

      {/* City Search and Radius */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="field-group md:col-span-2">
          <label htmlFor="city" className="label">
            {t.fuelPrices.city}
          </label>
          <PlaceAutocomplete
            id="city"
            value={selectedPlace}
            onChange={handlePlaceChange}
            disabled={isLoading}
          />
          <p className="mt-1 text-xs text-secondary">
            {t.fuelPrices.coordinatesHint}
          </p>
        </div>

        <div className="field-group">
          <label htmlFor="radius" className="label">
            {t.fuelPrices.radiusKm}
          </label>
          <input
            type="number"
            id="radius"
            step="0.1"
            min="0.1"
            max="25"
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            className="input"
            required
          />
        </div>
      </div>

      {/* Section: Search by Coordinates */}
      <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mt-4">
        {t.fuelPrices.searchByCoordinates}
      </h3>

      <div className="field-group">
        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={isGettingLocation}
          className="btn-secondary w-full"
        >
          {isGettingLocation
            ? t.fuelPrices.gettingLocation
            : t.fuelPrices.useMyLocation}
        </button>
      </div>

      {/* Resolved coordinates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="field-group">
          <label htmlFor="latitude" className="label">
            {t.fuelPrices.latitude}
          </label>
          <input
            type="text"
            id="latitude"
            value={latitude}
            readOnly
            className="input"
            placeholder="48.137154"
          />
        </div>

        <div className="field-group">
          <label htmlFor="longitude" className="label">
            {t.fuelPrices.longitude}
          </label>
          <input
            type="text"
            id="longitude"
            value={longitude}
            readOnly
            className="input"
            placeholder="11.576124"
          />
        </div>
      </div>
    </StandardForm>
  );
}
