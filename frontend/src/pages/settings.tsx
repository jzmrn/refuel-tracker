import React from "react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useUser } from "@/lib/auth/UserContext";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";
import ThemeSelector from "@/components/common/ThemeSelector";
import SettingCard from "@/components/common/SettingCard";

export default function Settings() {
  const { t } = useTranslation();
  const { user } = useUser();

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 md:py-8">
      {/* Page Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
          {t.settings.title}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300 text-sm md:text-base">
          {t.settings.description}
        </p>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* Account Settings */}
        {user && (
          <SettingCard
            title={user.name || "Account"}
            description={user.email || ""}
          >
            {user.picture && (
              <img
                src={user.picture}
                alt={user.name}
                className="w-16 h-16 rounded-full"
              />
            )}
          </SettingCard>
        )}

        {/* Language Settings */}
        <SettingCard
          title={t.settings.language.title}
          description={t.settings.language.description}
        >
          <LanguageSwitcher />
        </SettingCard>

        {/* Theme Settings */}
        <SettingCard
          title={t.settings.theme.title}
          description={t.settings.theme.description}
        >
          <ThemeSelector />
        </SettingCard>
      </div>
    </div>
  );
}
