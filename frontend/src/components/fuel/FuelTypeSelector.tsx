import { useTranslation } from "@/lib/i18n/LanguageContext";
import { FuelType } from "@/lib/api";

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

  const fuelTypeLabels: Record<FuelType, string> = {
    e5: includeDistance ? t.fuelPrices.e5Short : t.fuelPrices.e5,
    e10: includeDistance ? t.fuelPrices.e10Short : t.fuelPrices.e10,
    diesel: t.fuelPrices.diesel,
  };

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
          {fuelTypeLabels[fuelType]}
        </button>
      ))}
    </div>
  );
}
