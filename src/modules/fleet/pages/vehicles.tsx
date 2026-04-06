import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ServiceCRUD } from "@/modules/fleet/components/ServiceCRUD";
import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { ServiceRecord } from "@/modules/fleet/types";
import type { Truck } from "@/modules/transport/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function VehiclesPage() {
  const { t } = useTranslation();
  const [records, setRecords] = useState<ServiceRecord[]>(() =>
    getCollection<ServiceRecord>(STORAGE_KEYS.serviceRecords),
  );
  const [trucks] = useState<Truck[]>(() =>
    getCollection<Truck>(STORAGE_KEYS.trucks),
  );

  const handleRecordsChange = (updated: ServiceRecord[]) => {
    setRecords(updated);
  };

  // Grupează costurile pe lună pentru grafic
  const chartData = Object.values(
    records.reduce(
      (acc, r) => {
        const d = new Date(r.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (!acc[key]) acc[key] = { month: key, cost: 0 };
        acc[key].cost += r.cost;
        return acc;
      },
      {} as Record<string, { month: string; cost: number }>,
    ),
  ).sort((a, b) => a.month.localeCompare(b.month));

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">
          {t("fleet.vehicles.pageTitle")}
        </h1>
      </Header>
      <Main>
        <div className="flex flex-col gap-6">
          {/* Grafic costuri service în timp */}
          <Card>
            <CardHeader>
              <CardTitle>
                {t("fleet.vehicles.costChartTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis unit=" RON" />
              <Tooltip formatter={(val) => [Number(val).toLocaleString("ro-RO") + " RON", "Cost"]} />
                  <Line
                    type="monotone"
                    dataKey="cost"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={true}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Tabel toate intervențiile service */}
          <Card>
            <CardHeader>
              <CardTitle>
                {t("fleet.vehicles.serviceHistoryTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-4">
              <ServiceCRUD
                records={records}
                trucks={trucks}
                onRecordsChange={handleRecordsChange}
              />
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  );
}
