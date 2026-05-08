import { useCar } from "@/lib/hooks/useCars";
import { PageHeader } from "@/components/common";

interface CarPageHeaderProps {
  carId: string;
  title: string;
  onBack: () => void;
  actions?: React.ReactNode;
}

/**
 * Header component that fetches car data and displays it.
 * Must be used inside a <Suspense> boundary with a fallback PageHeader.
 */
export default function CarPageHeader({
  carId,
  title,
  onBack,
  actions,
}: CarPageHeaderProps) {
  const { data: car } = useCar(carId);

  return (
    <PageHeader
      title={title}
      subtitle={car ? `${car.name} (${car.year})` : undefined}
      onBack={onBack}
      actions={actions}
    />
  );
}
