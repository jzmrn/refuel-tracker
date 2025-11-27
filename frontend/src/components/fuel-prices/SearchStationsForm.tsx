import { useState } from "react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { GasStationSearchRequest, GasStationResponse } from "@/lib/api";
import { StandardForm } from "@/components/common/StandardForm";

interface SearchStationsFormProps {
  onSearch: (results: GasStationResponse[]) => void;
  onError: (error: string) => void;
}

export default function SearchStationsForm({
  onSearch,
  onError,
}: SearchStationsFormProps) {
  const { t } = useTranslation();
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radius, setRadius] = useState("10");
  const [fuelType, setFuelType] = useState("all");
  const [sortBy, setSortBy] = useState("dist");
  const [openOnly, setOpenOnly] = useState(true);
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
        fuel_type: fuelType,
        sort_by: sortBy,
        open_only: openOnly,
      };

      const results = await apiService.searchGasStations(searchParams);
      onSearch(results);
    } catch (error) {
      console.error("Search error:", error);
      onError(t.fuelPrices.failedToSearch);
    } finally {
      setIsSearching(false);
    }
  };

  const formActions = (
    <button type="submit" disabled={isSearching} className="btn-primary w-full">
      {isSearching ? t.common.loading : t.fuelPrices.search}
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

      {/* Search Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="field-group">
          <label htmlFor="fuelType" className="label">
            {t.fuelPrices.fuelType}
          </label>
          <select
            id="fuelType"
            value={fuelType}
            onChange={(e) => setFuelType(e.target.value)}
            className="input"
          >
            <option value="all">{t.fuelPrices.all}</option>
            <option value="e5">{t.fuelPrices.e5}</option>
            <option value="e10">{t.fuelPrices.e10}</option>
            <option value="diesel">{t.fuelPrices.diesel}</option>
          </select>
        </div>

        <div className="field-group">
          <label htmlFor="sortBy" className="label">
            {t.fuelPrices.sortBy}
          </label>
          <select
            id="sortBy"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="input"
          >
            <option value="dist">{t.fuelPrices.distance}</option>
            <option value="price">{t.fuelPrices.price}</option>
          </select>
        </div>

        {/* Open Only Filter */}
        <div className="field-group">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={openOnly}
              onChange={(e) => setOpenOnly(e.target.checked)}
              className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary dark:focus:ring-primary dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t.fuelPrices.showOpenOnly}
            </span>
          </label>
        </div>
      </div>
    </StandardForm>
  );
}
