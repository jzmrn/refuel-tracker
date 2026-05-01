import { Suspense } from "react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useStationMeta } from "@/lib/hooks/useFuelPrices";
import { PageHeader } from "@/components/common";
import StationSubtitle from "@/components/fuel/StationSubtitle";
import StationFavoriteButton from "./StationFavoriteButton";

interface StationPageHeaderProps {
  stationId: string;
  title: string;
  onBack: () => void;
  backLabel?: string;
}

export default function StationPageHeader({
  stationId,
  title,
  onBack,
  backLabel,
}: StationPageHeaderProps) {
  const { t } = useTranslation();
  const { data: stationData } = useStationMeta(stationId);

  return (
    <PageHeader
      title={title}
      subtitle={<StationSubtitle station={stationData} />}
      onBack={onBack}
      backLabel={backLabel ?? t.common.back}
      actions={
        <Suspense fallback={null}>
          <StationFavoriteButton stationId={stationId} />
        </Suspense>
      }
    />
  );
}
