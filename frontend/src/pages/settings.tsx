import React from "react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useUser } from "@/lib/auth/UserContext";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";
import ThemeSelector from "@/components/common/ThemeSelector";
import SettingCard from "@/components/common/SettingCard";
import { PageContainer, PageHeader, StackLayout } from "@/components/common";

export default function Settings() {
  const { t } = useTranslation();
  const { user } = useUser();

  return (
    <PageContainer maxWidth="4xl">
      <PageHeader title={t.settings.title} />

      {/* Settings Sections */}
      <StackLayout>
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
      </StackLayout>
    </PageContainer>
  );
}
