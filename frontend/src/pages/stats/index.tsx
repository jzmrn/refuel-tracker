import { useTranslation } from "@/lib/i18n/LanguageContext";
import StatsContent from "@/components/stats/StatsContent";

export default function StatsPage() {
  const { t } = useTranslation();

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 md:py-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="heading-1">{t.statistics.title}</h1>
        <p className="text-secondary mt-2 text-sm md:text-base">
          {t.statistics.description}
        </p>
      </div>

      <StatsContent />
    </div>
  );
}
