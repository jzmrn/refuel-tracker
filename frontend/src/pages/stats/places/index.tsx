import { Suspense } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { LoadingSpinner, PageContainer, PageHeader } from "@/components/common";
import PlacesContent from "@/components/stats/PlacesContent";

export default function PlacesPage() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <PageContainer>
      <PageHeader
        title={t.statistics.placesDetails}
        subtitle={t.statistics.placesDetailsDescription}
        onBack={() => router.push("/stats")}
        backLabel={t.statistics.back}
      />

      <Suspense fallback={<LoadingSpinner />}>
        <PlacesContent />
      </Suspense>
    </PageContainer>
  );
}
