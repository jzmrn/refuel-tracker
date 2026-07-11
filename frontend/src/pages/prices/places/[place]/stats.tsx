import { Suspense } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { LoadingSpinner, PageContainer, PageHeader } from "@/components/common";
import PlaceStationsContent from "@/components/stats/PlaceStationsContent";

function PlaceStatsPageContent({ place }: { place: string }) {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <PageContainer>
      <PageHeader
        title={t.statistics.placesDetails}
        subtitle={place}
        onBack={() => router.back()}
        backLabel={t.statistics.back}
      />

      <Suspense fallback={<LoadingSpinner />}>
        <PlaceStationsContent place={place} />
      </Suspense>
    </PageContainer>
  );
}

export default function PlaceStatsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { place } = router.query;

  if (!router.isReady || !place || typeof place !== "string") {
    return (
      <PageContainer>
        <PageHeader
          title={t.statistics.placesDetails}
          onBack={() => router.back()}
          backLabel={t.statistics.back}
        />
        <LoadingSpinner />
      </PageContainer>
    );
  }

  return <PlaceStatsPageContent place={decodeURIComponent(place)} />;
}
