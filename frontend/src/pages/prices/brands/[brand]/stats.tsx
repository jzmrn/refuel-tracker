import { Suspense } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { LoadingSpinner, PageContainer, PageHeader } from "@/components/common";
import BrandStationsContent from "@/components/stats/BrandStationsContent";

function BrandStatsPageContent({ brand }: { brand: string }) {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <PageContainer>
      <PageHeader
        title={t.statistics.brandsDetails}
        subtitle={brand}
        onBack={() => router.back()}
        backLabel={t.statistics.back}
      />

      <Suspense fallback={<LoadingSpinner />}>
        <BrandStationsContent brand={brand} />
      </Suspense>
    </PageContainer>
  );
}

export default function BrandStatsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { brand } = router.query;

  if (!router.isReady || !brand || typeof brand !== "string") {
    return (
      <PageContainer>
        <PageHeader
          title={t.statistics.brandsDetails}
          onBack={() => router.back()}
          backLabel={t.statistics.back}
        />
        <LoadingSpinner />
      </PageContainer>
    );
  }

  return <BrandStatsPageContent brand={decodeURIComponent(brand)} />;
}
