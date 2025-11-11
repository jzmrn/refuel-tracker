import React from "react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";
import ThemeSelector from "@/components/common/ThemeSelector";

export default function Settings() {
  const { t } = useTranslation();

  return (
    <div className="max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100">
          {t.settings.title}
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mt-4 text-lg">
          {t.settings.description}
        </p>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* Language Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {t.settings.language.title}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                {t.settings.language.description}
              </p>
            </div>
            <LanguageSwitcher />
          </div>
        </div>

        {/* Theme Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {t.settings.theme.title}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                {t.settings.theme.description}
              </p>
            </div>
            <ThemeSelector />
          </div>
        </div>
      </div>
    </div>
  );
}
