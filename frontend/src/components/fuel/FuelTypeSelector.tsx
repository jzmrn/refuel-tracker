import { useTranslation } from "@/lib/i18n/LanguageContext";
import { FuelType } from "@/lib/api";
import { getFuelTypeLabel } from "@/lib/fuelType";

interface FuelTypeSelectorProps {
  selectedFuelType: FuelType | null;
  onFuelTypeChange: (fuelType: FuelType) => void;
  availableFuelTypes?: FuelType[];
  includeDistance?: boolean;
  onDistanceSelect?: () => void;
  className?: string;
}

export default function FuelTypeSelector({
  selectedFuelType,
  onFuelTypeChange,
  availableFuelTypes = ["e5", "e10", "diesel"],
  includeDistance = false,
  onDistanceSelect,
  className = "",
}: FuelTypeSelectorProps) {
  const { t } = useTranslation();

  const isDistanceSelected = includeDistance && selectedFuelType === null;
  const cols = includeDistance ? "xs:grid-cols-4" : "xs:grid-cols-3";

  return (
    <div className={`grid grid-cols-1 ${cols} gap-2 ${className}`}>
      {includeDistance && (
        <button
          onClick={onDistanceSelect}
          className={`px-2 ${
            isDistanceSelected ? "btn-toggle-active" : "btn-toggle-inactive"
          }`}
        >
          {t.fuelPrices.distance}
        </button>
      )}
      {availableFuelTypes.map((fuelType) => (
        <button
          key={fuelType}
          onClick={() => onFuelTypeChange(fuelType)}
          className={
            selectedFuelType === fuelType
              ? "btn-toggle-active"
              : "btn-toggle-inactive"
          }
        >
          {getFuelTypeLabel(fuelType, t, includeDistance)}
        </button>
      ))}
    </div>
  );
}
