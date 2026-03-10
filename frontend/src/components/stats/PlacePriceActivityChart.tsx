import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { PlaceDetailAggregate } from "@/lib/api";
import {
  axisConfig,
  useGridConfig,
  useAxisColor,
  renderLegendText,
} from "@/lib/chartConfig";
import { buildPlaceColorMap, PlaceTooltip } from "./placeChartUtils";
import { useLocalization } from "@/lib/i18n/LanguageContext";

interface ChartEntry {
  date: string;
  [place: string]: string | number;
}

interface PlacePriceActivityChartProps {
  data: PlaceDetailAggregate[];
}

export default function PlacePriceActivityChart({
  data,
}: PlacePriceActivityChartProps) {
  const gridConfig = useGridConfig();
  const axisColor = useAxisColor();
  const { formatMonthLabel } = useLocalization();

  const { chartData, places } = useMemo(() => {
    const monthSet = new Set<string>();
    const placeSet = new Set<string>();
    const byMonth = new Map<string, Record<string, number>>();

    for (const d of data) {
      monthSet.add(d.date);
      placeSet.add(d.place);
      const entry = byMonth.get(d.date) ?? {};
      entry[d.place] = d.price_changes_per_station_day;
      byMonth.set(d.date, entry);
    }

    const months = Array.from(monthSet).sort();
    const places = Array.from(placeSet);

    places.sort();

    const chartData: ChartEntry[] = months.map((date) => ({
      date,
      ...(byMonth.get(date) ?? {}),
    }));

    return { chartData, places };
  }, [data]);

  const colorMap = useMemo(() => buildPlaceColorMap(places), [places]);

  if (chartData.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={chartData}
        margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
      >
        <CartesianGrid {...gridConfig} />
        <XAxis
          dataKey="date"
          {...axisConfig.xAxis}
          stroke={axisColor}
          tickFormatter={formatMonthLabel}
        />
        <YAxis {...axisConfig.yAxis} stroke={axisColor} domain={[0, "auto"]} />
        <Tooltip
          content={
            <PlaceTooltip
              labelFormatter={formatMonthLabel}
              valueFormatter={(v) => v.toFixed(2)}
            />
          }
        />
        <Legend formatter={renderLegendText} />
        {places.map((place) => (
          <Line
            key={place}
            type="monotone"
            dataKey={place}
            stroke={colorMap.get(place)}
            name={place}
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
