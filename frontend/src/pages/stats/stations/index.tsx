import { Suspense } from "react";
import { useRouter } from "next/router";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { LoadingSpinner } from "@/components/common";
import StationsContent from "@/components/stats/StationsContent";

export default function StationsPage() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 md:py-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => router.push("/stats")}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={t.statistics.back}
          >
            <ArrowBackIcon className="icon text-gray-600 dark:text-gray-400" />
          </button>
          <h1 className="heading-1">{t.statistics.stationsDetails}</h1>
        </div>
        <p className="text-secondary mt-2 text-sm md:text-base ml-11">
          {t.statistics.stationsDetailsDescription}
        </p>
      </div>

      <Suspense fallback={<LoadingSpinner />}>
        <StationsContent />
      </Suspense>
    </div>
  );
}
