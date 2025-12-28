import { useState } from "react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { GasStationSearchRequest, GasStationResponse } from "@/lib/api";
import { StandardForm } from "@/components/common/StandardForm";
import CircularProgress from "@mui/material/CircularProgress";

interface SearchStationsFormProps {
  onSearch: (
    results: GasStationResponse[],
    searchParams: {
      sortBy: string;
      lat: number;
      lng: number;
      rad: number;
    },
  ) => void;
  onError: (error: string) => void;
  isSubmitting?: boolean;
  initialValues?: {
    lat?: number;
    lng?: number;
    rad?: number;
    sortBy?: string;
  };
}

export default function SearchStationsForm({
  onSearch,
  onError,
  isSubmitting = false,
  initialValues,
}: SearchStationsFormProps) {
  const { t } = useTranslation();
  const [latitude, setLatitude] = useState(
    initialValues?.lat?.toString() || "",
  );
  const [longitude, setLongitude] = useState(
    initialValues?.lng?.toString() || "",
  );
  const [radius, setRadius] = useState(initialValues?.rad?.toString() || "10");
  const [isSearching, setIsSearching] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      onError(t.fuelPrices.locationNotSupported);
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
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
    if (!latitude) {
      onError(t.fuelPrices.latitudeRequired);
      return;
    }
    if (!longitude) {
      onError(t.fuelPrices.longitudeRequired);
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
      onSearch(results, { sortBy: "dist", lat, lng, rad });
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
      title={t.fuelPrices.searchStations}
      onSubmit={handleSubmit}
      actions={formActions}
      containerClass="panel"
    >
      {/* Location Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="field-group">
          <label htmlFor="latitude" className="label">
            {t.fuelPrices.latitude}
          </label>
          <input
            type="number"
            id="latitude"
            step="0.000001"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            className="input"
            placeholder="48.137154"
            required
          />
        </div>

        <div className="field-group">
          <label htmlFor="longitude" className="label">
            {t.fuelPrices.longitude}
          </label>
          <input
            type="number"
            id="longitude"
            step="0.000001"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            className="input"
            placeholder="11.576124"
            required
          />
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
    </StandardForm>
  );
}
