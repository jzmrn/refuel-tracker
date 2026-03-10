import { useRouter } from "next/router";
import PlaceIcon from "@mui/icons-material/Place";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import StatsContent from "@/components/stats/StatsContent";

export default function StatsPage() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 md:py-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center justify-between">
          <h1 className="heading-1">{t.statistics.title}</h1>
          <button
            onClick={() => router.push("/stats/places")}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={t.statistics.placesDetails}
          >
            <PlaceIcon className="icon text-gray-600 dark:text-gray-400" />
          </button>
        </div>
        <p className="text-secondary mt-2 text-sm md:text-base">
          {t.statistics.description}
        </p>
      </div>

      <StatsContent />
    </div>
  );
}
