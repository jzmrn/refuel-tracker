import React from "react";
import { LoadingSpinner } from "@/components/common";
import CarDetailsPanel from "./CarDetailsPanel";
import RecentRefuelsPanel from "./RecentRefuelsPanel";
import RecentKilometersPanel from "./RecentKilometersPanel";
import SharedUsersPanel from "./SharedUsersPanel";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { Car, RefuelMetric, KilometerEntry } from "@/lib/api";
import CloseIcon from "@mui/icons-material/Close";
import EmptyPanel from "@/components/common/EmptyPanel";

interface CarDetailsContentProps {
  car: Car | undefined;
  carLoading: boolean;
  carError: Error | null;
  refuels: RefuelMetric[];
  refuelsLoading: boolean;
  kilometerEntries: KilometerEntry[];
  kilometersLoading: boolean;
  isDeleting: boolean;
  isRevoking: boolean;
  onEditCar: () => void;
  onDeleteCar: () => void;
  onViewStats: () => void;
  onAddRefuel: () => void;
  onViewKilometerChart: () => void;
  onAddKilometer: () => void;
  onAddSharedUsers: () => void;
  onRemoveSharedUser: (userId: string) => void;
}

const CarDetailsContent: React.FC<CarDetailsContentProps> = ({
  car,
  carLoading,
  carError,
  refuels,
  refuelsLoading,
  kilometerEntries,
  kilometersLoading,
  isDeleting,
  isRevoking,
  onEditCar,
  onDeleteCar,
  onViewStats,
  onAddRefuel,
  onViewKilometerChart,
  onAddKilometer,
  onAddSharedUsers,
  onRemoveSharedUser,
}) => {
  const { t } = useTranslation();

  if (carError || !car) {
    return (
      <EmptyPanel
        icon={
          <CloseIcon className="icon-xl text-gray-400 dark:text-gray-500 mb-3" />
        }
        title={t.common.errorLoadingData}
      />
    );
  }

  if (carLoading && !isDeleting) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <CarDetailsPanel
        car={car}
        onEdit={onEditCar}
        onDelete={onDeleteCar}
        isDeleting={isDeleting}
      />

      <RecentRefuelsPanel
        refuels={refuels}
        loading={refuelsLoading}
        onViewStats={onViewStats}
        onAddRefuel={onAddRefuel}
      />

      <RecentKilometersPanel
        entries={kilometerEntries}
        loading={kilometersLoading}
        onViewChart={onViewKilometerChart}
        onAddEntry={onAddKilometer}
      />

      {car.is_owner && (
        <SharedUsersPanel
          sharedUsers={car.shared_users}
          onAddSharedUsers={onAddSharedUsers}
          onRemoveUser={onRemoveSharedUser}
          isRemoving={isRevoking}
        />
      )}
    </div>
  );
};

export default CarDetailsContent;
