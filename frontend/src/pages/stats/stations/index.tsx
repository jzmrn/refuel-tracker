import { Suspense } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { LoadingSpinner, PageContainer, PageHeader } from "@/components/common";
import StationsContent from "@/components/stats/StationsContent";

export default function StationsPage() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <PageContainer>
      <PageHeader
        title={t.statistics.stationsDetails}
        onBack={() => router.push("/stats")}
        backLabel={t.statistics.back}
      />

      <Suspense fallback={<LoadingSpinner />}>
        <StationsContent />
      </Suspense>
    </PageContainer>
  );
}
