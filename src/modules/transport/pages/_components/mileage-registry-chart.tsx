import { useTranslation } from "react-i18next";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ChartTooltip } from "@/components/charts/chart-tooltip";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { Truck } from "@/modules/transport/types";
import { LINE_COLORS } from "./mileage-registry-utils";

interface MileageChartProps {
  chartData: { month: string; [plate: string]: number | string }[];
  trucks: Truck[];
}

export function MileageChart({ chartData, trucks }: MileageChartProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader className="px-3 sm:px-6 pt-4 pb-2">
        <CardTitle className="text-sm sm:text-base">
          {t("mileageRegistry.chart.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-1 sm:px-4 pb-4">
        <div className="w-full" style={{ minHeight: 192 }}>
          <ResponsiveContainer width="100%" height={192}>
            <LineChart
              data={chartData}
              margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <ChartTooltip
                formatter={(value) =>
                  `${Number(value).toLocaleString()} km`
                }
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {trucks.map((truck, i) => (
                <Line
                  key={truck.id}
                  type="monotone"
                  dataKey={truck.plateNumber}
                  stroke={LINE_COLORS[i % LINE_COLORS.length]}
                  dot={false}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
