import CircularProgress from "@mui/material/CircularProgress";
import { useTranslation } from "@/lib/i18n/LanguageContext";

interface CarFormData {
  name: string;
  year: number | undefined;
  fuel_tank_size: number | undefined;
  fuel_type: string;
}

interface CarDetailsFormProps {
  formData: CarFormData;
  onFormDataChange: (data: CarFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
}

export function CarDetailsForm({
  formData,
  onFormDataChange,
  onSubmit,
  isSubmitting,
}: CarDetailsFormProps) {
  const { t } = useTranslation();

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={onSubmit} className="panel">
        <div className="form-container">
          {/* Car Name - full width */}
          <div className="field-group">
            <label htmlFor="name" className="label">
              {t.cars.carName} *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) =>
                onFormDataChange({ ...formData, name: e.target.value })
              }
              className="input"
              required
            />
          </div>

          {/* Year and Fuel Tank Size - side by side on sm+ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Year */}
            <div className="field-group">
              <label htmlFor="year" className="label">
                {t.cars.year} *
              </label>
              <input
                type="number"
                id="year"
                value={formData.year || ""}
                onChange={(e) =>
                  onFormDataChange({
                    ...formData,
                    year: parseInt(e.target.value) || undefined,
                  })
                }
                className="input"
                min="1900"
                max={new Date().getFullYear() + 1}
                required
              />
            </div>

            {/* Fuel Tank Size */}
            <div className="field-group">
              <label htmlFor="fuel_tank_size" className="label">
                {t.cars.fuelTankSize} (L) *
              </label>
              <input
                type="number"
                id="fuel_tank_size"
                value={formData.fuel_tank_size || ""}
                onChange={(e) =>
                  onFormDataChange({
                    ...formData,
                    fuel_tank_size: parseFloat(e.target.value) || undefined,
                  })
                }
                className="input"
                step="0.1"
                min="1"
                required
              />
            </div>
          </div>

          {/* Fuel Type */}
          <div className="field-group">
            <label htmlFor="fuel_type" className="label">
              {t.cars.fuelType} *
            </label>
            <select
              id="fuel_type"
              value={formData.fuel_type}
              onChange={(e) =>
                onFormDataChange({ ...formData, fuel_type: e.target.value })
              }
              className="input"
              required
            >
              <option value="">{t.cars.selectFuelType}</option>
              <option value="e5">{t.fuelPrices.e5}</option>
              <option value="e10">{t.fuelPrices.e10}</option>
              <option value="diesel">{t.fuelPrices.diesel}</option>
            </select>
          </div>

          {/* Submit Button */}
          <div className="form-actions">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <CircularProgress size={20} color="inherit" />
                  {t.common.saving}
                </>
              ) : (
                t.cars.saveChanges
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
