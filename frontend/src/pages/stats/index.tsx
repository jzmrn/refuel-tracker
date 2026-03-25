import { Suspense } from "react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { LoadingSpinner, PageContainer, PageHeader } from "@/components/common";
import StatsContent from "@/components/stats/StatsContent";

export default function StatsPage() {
  const { t } = useTranslation();

  return (
    <PageContainer>
      <PageHeader
        title={t.statistics.title}
        subtitle={t.statistics.description}
      />

      <Suspense fallback={<LoadingSpinner />}>
        <StatsContent />
      </Suspense>
    </PageContainer>
  );
}
