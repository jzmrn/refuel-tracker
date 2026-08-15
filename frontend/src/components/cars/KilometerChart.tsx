import React, { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { axisConfig, useGridConfig, useChartKey } from "@/lib/chartConfig";
import { useTranslation, useLocalization } from "@/lib/i18n/LanguageContext";
import { MobileChartCard } from "@/components/common/MobileChartCard";
import { useIsMobile } from "@/lib/hooks/useIsMobile";

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
  const chartKey = useChartKey(data);
  const isMobile = useIsMobile();
  const [selectedPoint, setSelectedPoint] = useState<ChartDataPoint | null>(
    null,
  );

  const formatKilometers = (value: number) => {
    return new Intl.NumberFormat("de-DE").format(Math.round(value)) + " km";
  };

  const renderTooltipContent = (point: ChartDataPoint) => {
    const date = new Date(point.timestamp);
    const formattedDate = formatDate(date, {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const formattedTime = formatDate(date, {
      hour: "2-digit",
      minute: "2-digit",
    });
    return (
      <>
        <div className="mb-2">
          <p className="font-medium text-primary">{formattedDate}</p>
          <p className="text-sm text-secondary">{formattedTime}</p>
        </div>
        <p className="space-y-1 text-sm">
          {`${t.kilometers.totalKilometers}: `}
          <span className="text-blue-600 dark:text-blue-400 font-semibold">
            {formatKilometers(point.total_kilometers)}
          </span>
        </p>
      </>
    );
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (isMobile || !active || !payload || !payload.length) return null;
    return (
      <div className="panel">{renderTooltipContent(payload[0].payload)}</div>
    );
  };

  return (
    <div>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart
          key={chartKey}
          data={data}
          margin={{
            top: 10,
            right: 10,
            left: 10,
            bottom: 10,
          }}
          onMouseMove={(state: any) => {
            if (isMobile && state.activePayload?.[0]?.payload) {
              setSelectedPoint(state.activePayload[0].payload);
            }
          }}
          onClick={(state: any) => {
            if (isMobile && state?.activePayload?.[0]?.payload) {
              setSelectedPoint(state.activePayload[0].payload);
            }
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
            domain={["dataMin", "dataMax"]}
            tickFormatter={(value) =>
              `${new Intl.NumberFormat("de-DE").format(value)} km`
            }
            {...axisConfig.yAxis}
            width={90}
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

      {isMobile && (
        <MobileChartCard>
          {renderTooltipContent(selectedPoint ?? data[0])}
        </MobileChartCard>
      )}
    </div>
  );
};

export default KilometerChart;
