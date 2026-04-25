import { Suspense } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import {
  useAddFavoriteStation,
  useFavoriteStations,
  useRemoveFavoriteStation,
  useStationMeta,
} from "@/lib/hooks/useFuelPrices";
import {
  FavoriteToggleButton,
  LoadingSpinner,
  PageContainer,
  PageHeader,
} from "@/components/common";
import StationSubtitle from "@/components/fuel/StationSubtitle";
import StationStatsContent from "@/components/stats/StationStatsContent";

function StationFavoriteButton({ stationId }: { stationId: string }) {
  const { data: favoritesResponse } = useFavoriteStations();
  const addFavorite = useAddFavoriteStation();
  const removeFavorite = useRemoveFavoriteStation();

  const isFavorite = favoritesResponse.stations.some(
    (f) => f.station_id === stationId,
  );

  return (
    <FavoriteToggleButton
      isFavorite={isFavorite}
      onAdd={() => addFavorite.mutateAsync(stationId)}
      onRemove={() => removeFavorite.mutateAsync(stationId)}
      isLoading={addFavorite.isPending || removeFavorite.isPending}
      size="md"
    />
  );
}

function StationStatsHeader({
  stationId,
  onBack,
}: {
  stationId: string;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const { data: stationData } = useStationMeta(stationId);

  return (
    <PageHeader
      title={t.statistics.stationStatsTitle}
      subtitle={<StationSubtitle station={stationData} />}
      onBack={onBack}
      backLabel={t.statistics.back}
      actions={
        <Suspense fallback={null}>
          <StationFavoriteButton stationId={stationId} />
        </Suspense>
      }
    />
  );
}

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
        <StationStatsHeader
          stationId={stationId}
          onBack={() => router.back()}
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
