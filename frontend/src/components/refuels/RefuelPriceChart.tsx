import React from "react";
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
import SummaryCard from "../common/SummaryCard";
import Panel from "../common/Panel";
import { GridLayout } from "../common/GridLayout";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import BarChartIcon from "@mui/icons-material/BarChart";
import {
  useTranslation,
  useLocalization,
} from "../../lib/i18n/LanguageContext";
import { useChartTheme } from "../../lib/theme";
import { renderSvgFuelPrice } from "../../lib/formatPrice";

interface PriceTrend {
  date: string;
  timestamp: string;
  price: number;
  amount: number;
  total_cost: number;
}

interface RefuelPriceChartProps {
  priceData: PriceTrend[];
}

export default function RefuelPriceChart({ priceData }: RefuelPriceChartProps) {
  const { t } = useTranslation();
  const { formatDate } = useLocalization();
  const chartTheme = useChartTheme();

  if (!priceData || priceData.length === 0) {
    return (
      <Panel title={t.refuels.priceTrendsOverTime}>
        <div className="empty-state">
          <p>{t.refuels.noPriceTrendData}</p>
          <p className="text-sm mt-1">{t.refuels.addMoreRefuelEntries}</p>
        </div>
      </Panel>
    );
  }

  // Sort data by timestamp to ensure proper chronological order
  const sortedData = [...priceData]
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    )
    .map((item) => ({
      ...item,
      timestampMs: new Date(item.timestamp).getTime(),
      displayDate: formatDate(new Date(item.timestamp), {
        month: "short",
        day: "numeric",
        year: "2-digit",
      }),
      priceFormatted: parseFloat(item.price.toFixed(3)),
      totalCostFormatted: parseFloat(item.total_cost.toFixed(2)),
    }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
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
          <div className="space-y-1 text-sm">
            <p className="flex justify-between gap-4">
              <span className="text-gray-400">
                {t.refuels.pricePerLiterTooltip}
              </span>
              <span className="text-blue-600 dark:text-blue-400 font-semibold">
                {renderSvgFuelPrice(data.price)}
              </span>
            </p>
            <p className="flex justify-between gap-4">
              <span className="text-gray-400">{t.refuels.amountTooltip}</span>
              <span className="text-green-600 dark:text-green-400 font-semibold">
                {data.amount.toFixed(2)} L
              </span>
            </p>
            <p className="flex justify-between gap-4">
              <span className="text-gray-400">
                {t.refuels.totalCostTooltip}
              </span>
              <span className="text-purple-600 dark:text-purple-400 font-semibold">
                {formatCurrency(data.total_cost)}
              </span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Calculate min and max values for better scaling
  const prices = sortedData.map((d) => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;
  const yAxisMin = Math.max(0, minPrice - priceRange * 0.1);
  const yAxisMax = maxPrice + priceRange * 0.1;

  let ticks: number[] | undefined = undefined;
  if (prices.length > 0) {
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const start = Math.floor(min * 1000) / 1000;
    const startCents = Math.round(start * 1000) % 10;
    let current = start - (startCents - 9) / 1000;
    ticks = [];
    while (current <= max) {
      ticks.push(Math.round(current * 1000) / 1000);
      current += 0.01;
    }
  }

  return (
    <Panel title={t.refuels.priceTrendsOverTime}>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={sortedData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 20,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
          <XAxis
            type="number"
            dataKey="timestampMs"
            scale="time"
            domain={["dataMin", "dataMax"]}
            stroke={chartTheme.axis}
            fontSize={12}
            tickMargin={10}
            height={40}
            tickFormatter={(value) => {
              const date = new Date(value);
              return formatDate(date, {
                month: "short",
                day: "numeric",
                year: "2-digit",
              });
            }}
          />
          <YAxis
            domain={[yAxisMin, yAxisMax]}
            stroke={chartTheme.axis}
            fontSize={12}
            tickFormatter={(value) => `${value.toFixed(2)}`}
            ticks={ticks}
            tick={(props: any) => {
              const { x, y, payload } = props;
              return (
                <g transform={`translate(${x},${y})`}>
                  <text
                    x={0}
                    y={0}
                    dy={4}
                    textAnchor="end"
                    className="text-xs fill-gray-600 dark:fill-gray-400"
                  >
                    {renderSvgFuelPrice(payload.value)}
                  </text>
                </g>
              );
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="priceFormatted"
            stroke={chartTheme.primaryLine}
            strokeWidth={3}
            dot={{
              fill: chartTheme.primaryDot,
              strokeWidth: 2,
              r: 4,
            }}
            activeDot={{
              r: 6,
              fill: chartTheme.primaryDot,
              strokeWidth: 2,
              stroke: chartTheme.activeDotStroke,
            }}
            name={t.refuels.pricePerLiterChart}
          />
        </LineChart>
      </ResponsiveContainer>

      {sortedData.length > 0 && (
        <GridLayout variant="stats" className="mt-4 text-sm">
          <SummaryCard
            title={t.fuelPrices.currentPrice}
            value={{
              value: sortedData[sortedData.length - 1].price,
              formatter: renderSvgFuelPrice,
              unit: "€/L",
            }}
            icon={
              <AttachMoneyIcon className="icon-lg text-blue-600 dark:text-blue-400" />
            }
            iconBgColor="blue"
          />

          <SummaryCard
            title={t.refuels.lowestPrice}
            value={{
              value: minPrice,
              formatter: renderSvgFuelPrice,
              unit: "€/L",
            }}
            icon={
              <TrendingDownIcon className="icon-lg text-green-600 dark:text-green-400" />
            }
            iconBgColor="green"
          />

          <SummaryCard
            title={t.refuels.highestPrice}
            value={{
              value: maxPrice,
              formatter: renderSvgFuelPrice,
              unit: "€/L",
            }}
            icon={
              <TrendingUpIcon className="icon-lg text-red-600 dark:text-red-400" />
            }
            iconBgColor="red"
          />

          <SummaryCard
            title={t.refuels.priceRange}
            value={{
              value: priceRange,
              formatter: renderSvgFuelPrice,
              unit: "€/L",
            }}
            icon={
              <BarChartIcon className="icon-lg text-gray-600 dark:text-gray-400" />
            }
            iconBgColor="gray"
          />
        </GridLayout>
      )}
    </Panel>
  );
}
