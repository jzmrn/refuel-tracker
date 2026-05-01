import { Suspense } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { LoadingSpinner, PageContainer, PageHeader } from "@/components/common";
import StatsContent from "@/components/stats/StatsContent";

export default function StatsPage() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <PageContainer>
      <PageHeader
        title={t.statistics.title}
        onBack={() => router.push("/prices")}
        backLabel={t.statistics.back}
      />

      <Suspense fallback={<LoadingSpinner />}>
        <StatsContent />
      </Suspense>
    </PageContainer>
  );
}
