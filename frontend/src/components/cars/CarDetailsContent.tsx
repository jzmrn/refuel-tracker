import React from "react";
import CarDetailsPanel from "./CarDetailsPanel";
import RecentRefuelsPanel from "./RecentRefuelsPanel";
import RecentKilometersPanel from "./RecentKilometersPanel";
import SharedUsersPanel from "./SharedUsersPanel";
import CloseIcon from "@mui/icons-material/Close";
import {
  useCar,
  useRefuelMetrics,
  useKilometerEntries,
} from "@/lib/hooks/useCars";
import { EmptyPanel } from "@/components/common";
import { useTranslation } from "@/lib/i18n/LanguageContext";

interface CarDetailsContentProps {
  carId: string;
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
  carId,
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
  const { data: car } = useCar(carId);

  if (!car) {
    return (
      <EmptyPanel
        icon={
          <CloseIcon className="icon-xl text-gray-400 dark:text-gray-500 mb-3" />
        }
        title={t.common.errorLoadingData}
      />
    );
  }

  const { data: refuels } = useRefuelMetrics(carId, { limit: 5 });
  const { data: kilometerData } = useKilometerEntries(carId, {
    limit: 5,
  });

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
        loading={false}
        onViewStats={onViewStats}
        onAddRefuel={onAddRefuel}
      />

      <RecentKilometersPanel
        entries={kilometerData.entries}
        loading={false}
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
