import type { StationMetaResponse } from "@/lib/api";

interface StationSubtitleProps {
  station: StationMetaResponse | undefined;
}

export default function StationSubtitle({ station }: StationSubtitleProps) {
  if (!station?.brand || !station?.place) {
    return <>{station?.station_id}</>;
  }

  return (
    <>
      {station.brand}
      {" · "}
      {station.place}
      {station.street && (
        <span className="hidden md:inline">
          {" · "}
          {station.street}
          {station.house_number ? ` ${station.house_number}` : ""}
        </span>
      )}
    </>
  );
}
