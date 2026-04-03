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
          className={`px-2 py-2 rounded-lg text-sm font-medium transition-colors ${
            isDistanceSelected
              ? "bg-primary-50 text-primary-700 dark:bg-blue-900/20 dark:text-blue-300"
              : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
          }`}
        >
          {t.fuelPrices.distance}
        </button>
      )}
      {availableFuelTypes.map((fuelType) => (
        <button
          key={fuelType}
          onClick={() => onFuelTypeChange(fuelType)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedFuelType === fuelType
              ? "bg-primary-50 text-primary-700 dark:bg-blue-900/20 dark:text-blue-300"
              : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
          }`}
        >
          {fuelTypeLabels[fuelType]}
        </button>
      ))}
    </div>
  );
}
