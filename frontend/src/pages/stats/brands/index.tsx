import { Suspense } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { LoadingSpinner, PageContainer, PageHeader } from "@/components/common";
import BrandsContent from "@/components/stats/BrandsContent";

export default function BrandsPage() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <PageContainer>
      <PageHeader
        title={t.statistics.brandsDetails}
        onBack={() => router.push("/stats")}
        backLabel={t.statistics.back}
      />

      <Suspense fallback={<LoadingSpinner />}>
        <BrandsContent />
      </Suspense>
    </PageContainer>
  );
}
