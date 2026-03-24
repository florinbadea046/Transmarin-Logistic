// ──────────────────────────────────────────────────────────
// Rapoarte Transport — D13 (Export PDF, Excel, CSV)
// src/modules/reports/pages/transport-reports.tsx
// ──────────────────────────────────────────────────────────

import { useMemo } from "react";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Order } from "@/modules/transport/types";
import { useExport } from "@/modules/reports/hooks/useExport";
import type { ExportOptions } from "@/modules/reports/hooks/useExport";

const COLUMNS = [
  { header: "Client", key: "clientName" },
  { header: "Origine", key: "origin" },
  { header: "Destinație", key: "destination" },
  { header: "Dată", key: "date" },
  { header: "Greutate (t)", key: "weight" },
  { header: "Status", key: "status" },
];

// ← ADĂUGAT: traducere status în română
const orderStatusLabel: Record<string, string> = {
  pending: "În așteptare",
  assigned: "Atribuit",
  in_transit: "În tranzit",
  delivered: "Livrat",
  cancelled: "Anulat",
};

export default function TransportReportsPage() {
  const { exportPDF, exportExcel, exportCSV } = useExport();

  const orders = useMemo(() => getCollection<Order>(STORAGE_KEYS.orders), []);

  const exportOptions: ExportOptions = {
    filename: "raport-transport",
    title: "Raport Transport",
    columns: COLUMNS,
    rows: orders as unknown as Record<string, unknown>[],
  };

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">Rapoarte Transport</h1>
      </Header>
      <Main>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Comenzi Transport</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => exportPDF(exportOptions)}>
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportExcel(exportOptions)}>
                Excel
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportCSV(exportOptions)}>
                CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nu există comenzi înregistrate.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Origine</TableHead>
                    <TableHead>Destinație</TableHead>
                    <TableHead>Dată</TableHead>
                    <TableHead>Greutate (t)</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>{order.clientName}</TableCell>
                      <TableCell>{order.origin}</TableCell>
                      <TableCell>{order.destination}</TableCell>
                      <TableCell>{order.date}</TableCell>
                      <TableCell>{order.weight}</TableCell>
                      <TableCell>{orderStatusLabel[order.status]}</TableCell> {}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </Main>
    </>
  );
}
