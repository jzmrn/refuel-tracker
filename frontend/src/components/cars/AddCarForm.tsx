import React, { useState } from "react";
import { CarCreate, apiService } from "../../lib/api";
import { useTranslation } from "../../lib/i18n/LanguageContext";

interface AddCarFormProps {
  onCarAdded: () => void;
  onError: (message: string) => void;
}

const AddCarForm: React.FC<AddCarFormProps> = ({ onCarAdded, onError }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<CarCreate>({
    name: "",
    year: new Date().getFullYear(),
    fuel_tank_size: 50,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await apiService.createCar(formData);
      onCarAdded();

      // Reset form
      setFormData({
        name: "",
        year: new Date().getFullYear(),
        fuel_tank_size: 50,
      });
    } catch (error: any) {
      console.error("Error creating car:", error);
      onError(error.response?.data?.detail || t.cars.failedToCreateCar);
    }
  };

  const handleClear = () => {
    setFormData({
      name: "",
      year: new Date().getFullYear(),
      fuel_tank_size: 50,
    });
  };

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {t.cars.addNewCar}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.common.name} *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="input"
              placeholder={t.cars.carNamePlaceholder}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.cars.year} *
            </label>
            <input
              type="number"
              value={formData.year}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  year: parseInt(e.target.value) || new Date().getFullYear(),
                })
              }
              className="input"
              placeholder={t.cars.yearPlaceholder}
              min="1900"
              max="2100"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Fuel Tank Size (L) *
            </label>
            <input
              type="number"
              value={formData.fuel_tank_size}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  fuel_tank_size: parseFloat(e.target.value) || 50,
                })
              }
              className="input"
              placeholder="e.g., 50"
              min="0.1"
              step="0.1"
              required
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={handleClear} className="btn-secondary">
            {t.cars.clear}
          </button>
          <button type="submit" className="btn-primary">
            {t.cars.addCar}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddCarForm;
