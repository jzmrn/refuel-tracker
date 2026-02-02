import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { axisConfig, useGridConfig } from "@/lib/chartConfig";
import { useTranslation, useLocalization } from "@/lib/i18n/LanguageContext";

interface ChartDataPoint {
  timestamp: number;
  total_kilometers: number;
  displayDate: string;
}

interface KilometerChartProps {
  data: ChartDataPoint[];
}

const KilometerChart: React.FC<KilometerChartProps> = ({ data }) => {
  const { t } = useTranslation();
  const { formatDate } = useLocalization();
  const gridConfig = useGridConfig();

  const formatKilometers = (value: number) => {
    return new Intl.NumberFormat("de-DE").format(Math.round(value)) + " km";
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const date = new Date(label);
      const formattedDate = formatDate(date, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const formattedTime = formatDate(date, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      return (
        <div className="panel">
          <div className="mb-2">
            <p className="font-medium text-primary">{formattedDate}</p>
            <p className="text-sm text-secondary">{formattedTime}</p>
          </div>
          <p className="space-y-1 text-sm">
            {`${t.kilometers.totalKilometers}: `}
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
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{
            top: 10,
            right: 10,
            left: 10,
            bottom: 10,
          }}
        >
          <CartesianGrid {...gridConfig} />
          <XAxis
            dataKey="timestamp"
            type="number"
            domain={["dataMin", "dataMax"]}
            scale="time"
            tickFormatter={(timestamp) => {
              const date = new Date(timestamp);
              return formatDate(date, {
                month: "short",
                day: "numeric",
              });
            }}
            {...axisConfig.xAxis}
          />
          <YAxis
            tickFormatter={(value) =>
              `${new Intl.NumberFormat("de-DE").format(value)} km`
            }
            {...axisConfig.yAxis}
            width={80}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="total_kilometers"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{
              fill: "#3b82f6",
              stroke: "#3b82f6",
              strokeWidth: 2,
              r: 4,
            }}
            activeDot={{
              r: 6,
              stroke: "#3b82f6",
              strokeWidth: 2,
              fill: "#fff",
            }}
            name={t.kilometers.totalKilometers}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default KilometerChart;
