import { Suspense } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { LoadingSpinner, PageContainer, PageHeader } from "@/components/common";
import { StationPageHeader } from "@/components/station";
import StationStatsContent from "@/components/stats/StationStatsContent";

function StationStatsPageContent({ stationId }: { stationId: string }) {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <PageContainer>
      <Suspense
        fallback={
          <PageHeader
            title={t.statistics.stationStatsTitle}
            onBack={() => router.back()}
            backLabel={t.statistics.back}
          />
        }
      >
        <StationPageHeader
          stationId={stationId}
          title={t.statistics.stationStatsTitle}
          onBack={() => router.back()}
          backLabel={t.statistics.back}
        />
      </Suspense>

      <div className="mt-4">
        <Suspense fallback={<LoadingSpinner />}>
          <StationStatsContent stationId={stationId} />
        </Suspense>
      </div>
    </PageContainer>
  );
}

export default function StationStatsPage() {
  const router = useRouter();
  const { id } = router.query;

  if (!id || typeof id !== "string") {
    return (
      <PageContainer>
        <LoadingSpinner />
      </PageContainer>
    );
  }

  return <StationStatsPageContent stationId={id} />;
}
