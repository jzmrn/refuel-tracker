import { useState } from "react";
import { useRouter } from "next/router";
import { StandardForm } from "@/components/common/StandardForm";
import Snackbar from "@/components/common/Snackbar";
import { PageContainer, PageHeader } from "@/components/common";
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
      router.push("/cars");
    } catch (error: any) {
      console.error("Error creating car:", error);
      showError(error.response?.data?.detail || t.cars.failedToCreateCar);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader title={t.cars.addCar} onBack={handleBack} />

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
          <div className="form-group">
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
          <div className="form-group">
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
          <div className="form-group">
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
          <div className="form-group">
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
    </PageContainer>
  );
}
