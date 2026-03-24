// ──────────────────────────────────────────────────────────
// Rapoarte Parc Auto — D13 (Export PDF, Excel, CSV)
// src/modules/reports/pages/fleet-reports.tsx
// ──────────────────────────────────────────────────────────

import { useMemo } from "react";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Truck } from "@/modules/transport/types";
import { useExport } from "@/modules/reports/hooks/useExport";
import type { ExportOptions } from "@/modules/reports/hooks/useExport";

const COLUMNS = [
  { header: "Nr. Înmatriculare", key: "plateNumber" },
  { header: "Marcă", key: "brand" },
  { header: "Model", key: "model" },
  { header: "An", key: "year" },
  { header: "Km", key: "mileage" },
  { header: "Status", key: "status" },
  { header: "Expirare ITP", key: "itpExpiry" },
  { header: "Expirare RCA", key: "rcaExpiry" },
];

// ← ADĂUGAT: traducere status în română
const truckStatusLabel: Record<string, string> = {
  available: "Disponibil",
  on_trip: "În cursă",
  in_service: "În service",
};

export default function FleetReportsPage() {
  const { exportPDF, exportExcel, exportCSV } = useExport();

  const trucks = useMemo(() => getCollection<Truck>(STORAGE_KEYS.trucks), []);

  const exportOptions: ExportOptions = {
    // ← MODIFICAT
    filename: "raport-parc-auto",
    title: "Raport Parc Auto",
    columns: COLUMNS,
    rows: trucks.map((truck) => ({
      ...truck,
      status: truckStatusLabel[truck.status], // ← ADĂUGAT: traducere status în export
    })) as unknown as Record<string, unknown>[],
  };

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">Rapoarte Parc Auto</h1>
      </Header>
      <Main>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Camioane</CardTitle>
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
            {trucks.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nu există camioane înregistrate.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nr. Înmatriculare</TableHead>
                    <TableHead>Marcă</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>An</TableHead>
                    <TableHead>Km</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expirare ITP</TableHead>
                    <TableHead>Expirare RCA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trucks.map((truck) => (
                    <TableRow key={truck.id}>
                      <TableCell>{truck.plateNumber}</TableCell>
                      <TableCell>{truck.brand}</TableCell>
                      <TableCell>{truck.model}</TableCell>
                      <TableCell>{truck.year}</TableCell>
                      <TableCell>{truck.mileage.toLocaleString("ro-RO")}</TableCell>
                      <TableCell>{truckStatusLabel[truck.status]}</TableCell> {/* ← MODIFICAT */}
                      <TableCell>{truck.itpExpiry}</TableCell>
                      <TableCell>{truck.rcaExpiry}</TableCell>
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
