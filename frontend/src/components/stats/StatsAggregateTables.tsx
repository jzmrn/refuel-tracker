import React from "react";
import { useRouter } from "next/router";
import {
  MonthlyStationAggregate,
  MonthlyPlaceAggregate,
  MonthlyBrandAggregate,
} from "@/lib/api";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { renderSvgFuelPrice } from "@/lib/formatPrice";
import { StandardCard } from "@/components/common";
import LocalGasStationIcon from "@mui/icons-material/LocalGasStation";
import PlaceIcon from "@mui/icons-material/Place";
import BusinessIcon from "@mui/icons-material/Business";
import BarChartIcon from "@mui/icons-material/BarChart";

interface StatsAggregateTablesProps {
  stations: MonthlyStationAggregate[];
  places: MonthlyPlaceAggregate[];
  brands: MonthlyBrandAggregate[];
}

const StatsAggregateTables: React.FC<StatsAggregateTablesProps> = ({
  stations,
  places,
  brands,
}) => {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <>
      {/* Cheapest Stations */}
      <StandardCard
        title={t.statistics.cheapestStations}
        icon={
          <LocalGasStationIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        }
        iconBackground="purple"
        headerAction={
          <button
            onClick={() => router.push("/stats/stations")}
            className="btn-icon"
            aria-label={t.statistics.stationsDetails}
          >
            <BarChartIcon className="icon text-gray-600 dark:text-gray-400" />
          </button>
        }
      >
        {stations.length === 0 ? (
          <p className="text-secondary text-sm">
            {t.statistics.noDataAvailable}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    {t.statistics.station}
                  </th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider hidden sm:table-cell">
                    {t.statistics.place}
                  </th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider hidden xl:table-cell">
                    {t.statistics.address}
                  </th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs font-medium text-secondary uppercase tracking-wider">
                    {t.statistics.averagePrice}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {stations.map((s) => (
                  <tr
                    key={s.station_id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() =>
                      router.push(`/stats/stations/${s.station_id}`)
                    }
                  >
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-primary">
                      <div className="font-medium">
                        {s.brand || s.station_name}
                      </div>
                      {s.place && (
                        <div className="text-secondary text-xs sm:hidden">
                          {s.place}
                        </div>
                      )}
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-primary hidden sm:table-cell">
                      {s.place || "-"}
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-primary hidden xl:table-cell">
                      {s.street
                        ? `${s.street} ${s.house_number || ""}`.trim()
                        : "-"}
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-primary font-medium text-right tabular-nums whitespace-nowrap">
                      {renderSvgFuelPrice(s.price_mean)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </StandardCard>

      {/* Cheapest Places */}
      <StandardCard
        title={t.statistics.cheapestPlaces}
        icon={
          <PlaceIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
        }
        iconBackground="orange"
        headerAction={
          <button
            onClick={() => router.push("/stats/places")}
            className="btn-icon"
            aria-label={t.statistics.placesDetails}
          >
            <BarChartIcon className="icon text-gray-600 dark:text-gray-400" />
          </button>
        }
      >
        {places.length === 0 ? (
          <p className="text-secondary text-sm">
            {t.statistics.noDataAvailable}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    {t.statistics.place}
                  </th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider hidden sm:table-cell">
                    {t.statistics.postCode}
                  </th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider hidden sm:table-cell">
                    {t.statistics.numStations}
                  </th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs font-medium text-secondary uppercase tracking-wider">
                    {t.statistics.averagePrice}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {places.map((p) => (
                  <tr
                    key={`${p.place}-${p.post_code}`}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-primary">
                      <div className="font-medium">{p.place}</div>
                      <div className="text-secondary text-xs sm:hidden">
                        {p.post_code} · {p.n_stations}{" "}
                        {t.statistics.numStations.toLowerCase()}
                      </div>
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-primary hidden sm:table-cell">
                      {p.post_code}
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-primary hidden sm:table-cell">
                      {p.n_stations}
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-primary font-medium text-right tabular-nums whitespace-nowrap">
                      {renderSvgFuelPrice(p.price_mean)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </StandardCard>

      {/* Cheapest Brands */}
      <StandardCard
        title={t.statistics.cheapestBrands}
        icon={
          <BusinessIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        }
        iconBackground="indigo"
        headerAction={
          <button
            onClick={() => router.push("/stats/brands")}
            className="btn-icon"
            aria-label={t.statistics.brandsDetails}
          >
            <BarChartIcon className="icon text-gray-600 dark:text-gray-400" />
          </button>
        }
      >
        {brands.length === 0 ? (
          <p className="text-secondary text-sm">
            {t.statistics.noDataAvailable}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    {t.statistics.brand}
                  </th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider hidden sm:table-cell">
                    {t.statistics.numStations}
                  </th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs font-medium text-secondary uppercase tracking-wider">
                    {t.statistics.averagePrice}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {brands.map((b) => (
                  <tr
                    key={b.brand}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-primary">
                      <div className="font-medium">{b.brand}</div>
                      <div className="text-secondary text-xs sm:hidden">
                        {b.n_stations} {t.statistics.numStations.toLowerCase()}
                      </div>
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-primary hidden sm:table-cell">
                      {b.n_stations}
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-primary font-medium text-right tabular-nums whitespace-nowrap">
                      {renderSvgFuelPrice(b.price_mean)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </StandardCard>
    </>
  );
};

export default StatsAggregateTables;
