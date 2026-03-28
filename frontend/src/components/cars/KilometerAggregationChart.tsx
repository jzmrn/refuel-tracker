import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { axisConfig, useGridConfig, useChartKey } from "@/lib/chartConfig";
import { useTranslation, useLocalization } from "@/lib/i18n/LanguageContext";
import type { KilometerPeriodAggregate } from "@/lib/api";

interface KilometerAggregationChartProps {
  data: KilometerPeriodAggregate[];
  aggregation: "monthly" | "yearly";
}

const KilometerAggregationChart: React.FC<KilometerAggregationChartProps> = ({
  data,
  aggregation,
}) => {
  const { t } = useTranslation();
  const { formatDate } = useLocalization();
  const gridConfig = useGridConfig();
  const chartKey = useChartKey(data);

  const chartData = useMemo(
    () =>
      data.map((item) => {
        const date = new Date(item.period_start + "T00:00:00");
        const label =
          aggregation === "yearly"
            ? date.getFullYear().toString()
            : formatDate(date, { month: "short", year: "numeric" });
        return {
          ...item,
          label,
        };
      }),
    [data, aggregation, formatDate],
  );

  const formatKilometers = (value: number) => {
    return new Intl.NumberFormat("de-DE").format(Math.round(value)) + " km";
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="panel">
          <p className="font-medium text-primary mb-1">{label}</p>
          <p className="text-sm">
            {`${t.kilometers.kilometersDriven}: `}
            <span className="text-blue-600 dark:text-blue-400 font-semibold">
              {formatKilometers(payload[0].value)}
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          key={chartKey}
          data={chartData}
          margin={{
            top: 10,
            right: 10,
            left: 10,
            bottom: 10,
          }}
        >
          <CartesianGrid {...gridConfig} />
          <XAxis dataKey="label" {...axisConfig.xAxis} />
          <YAxis
            tickFormatter={(value) =>
              `${new Intl.NumberFormat("de-DE").format(value)} km`
            }
            {...axisConfig.yAxis}
            width={90}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="kilometers_driven"
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
            name={t.kilometers.kilometersDriven}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default KilometerAggregationChart;
