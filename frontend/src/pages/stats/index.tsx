import { Suspense, useState, useEffect, startTransition } from "react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { LoadingSpinner } from "@/components/common";
import StatsContent from "@/components/stats/StatsContent";

export default function StatsPage() {
  const { t } = useTranslation();

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 md:py-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center justify-between">
          <h1 className="heading-1">{t.statistics.title}</h1>
        </div>
        <p className="text-secondary mt-2 text-sm md:text-base">
          {t.statistics.description}
        </p>
      </div>

      <Suspense fallback={<LoadingSpinner />}>
        <StatsContent />
      </Suspense>
    </div>
  );
}
