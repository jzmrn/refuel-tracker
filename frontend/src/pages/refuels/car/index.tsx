import { useState } from "react";
import { useRouter } from "next/router";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { StandardForm } from "@/components/common/StandardForm";
import Snackbar from "@/components/common/Snackbar";
import { useSnackbar } from "@/lib/useSnackbar";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useCreateCar } from "@/lib/hooks/useCars";
import { CarCreate } from "@/lib/api";

export default function AddCar() {
  const { t } = useTranslation();
  const router = useRouter();
  const createCar = useCreateCar();
  const { snackbar, showError, hideSnackbar } = useSnackbar();

  const [formData, setFormData] = useState<{
    name: string;
    year: number | undefined;
    fuel_tank_size: number | undefined;
    fuel_type: string;
  }>({
    name: "",
    year: undefined,
    fuel_tank_size: undefined,
    fuel_type: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBack = () => {
    router.back();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.name ||
      !formData.year ||
      !formData.fuel_tank_size ||
      !formData.fuel_type
    ) {
      showError(t.cars.fillAllRequiredFields);
      return;
    }

    try {
      setIsSubmitting(true);
      const createData: CarCreate = {
        name: formData.name,
        year: formData.year,
        fuel_tank_size: formData.fuel_tank_size,
        fuel_type: formData.fuel_type,
      };
      await createCar.mutateAsync(createData);

      // Navigate back to cars list
      router.push("/refuels");
    } catch (error: any) {
      console.error("Error creating car:", error);
      showError(error.response?.data?.detail || t.cars.failedToCreateCar);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 md:py-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={handleBack}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={t.common.back}
          >
            <ArrowBackIcon className="icon text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex-1">
            <h1 className="heading-1">{t.cars.addCar}</h1>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto">
        <StandardForm
          onSubmit={handleSubmit}
          containerClass="panel"
          actions={
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full"
            >
              {isSubmitting ? t.common.saving : t.cars.addCar}
            </button>
          }
        >
          {/* Car Name */}
          <div className="field-group">
            <label htmlFor="name" className="label">
              {t.cars.carName} *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="input"
              required
            />
          </div>

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
                setFormData({
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
                setFormData({
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

          {/* Fuel Type */}
          <div className="field-group">
            <label htmlFor="fuel_type" className="label">
              {t.cars.fuelType} *
            </label>
            <select
              id="fuel_type"
              value={formData.fuel_type}
              onChange={(e) =>
                setFormData({ ...formData, fuel_type: e.target.value })
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
        </StandardForm>
      </div>

      {/* Snackbar */}
      {snackbar.isVisible && (
        <Snackbar
          message={snackbar.message}
          type={snackbar.type}
          onClose={hideSnackbar}
          isVisible={true}
        />
      )}
    </div>
  );
}
