// ──────────────────────────────────────────────────────────
// Rapoarte Financiare — D13 (Export PDF, Excel, CSV)
// src/modules/reports/pages/financial-reports.tsx
// ──────────────────────────────────────────────────────────

import { useMemo } from "react";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCollection } from "@/utils/local-storage";
import { formatCurrency } from "@/utils/format";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Invoice } from "@/modules/accounting/types";
import { useExport } from "@/modules/reports/hooks/useExport";
import type { ExportOptions } from "@/modules/reports/hooks/useExport"; // ← ADĂUGAT

const COLUMNS = [
  { header: "Nr. Factură", key: "number" },
  { header: "Tip", key: "type" },
  { header: "Client/Furnizor", key: "clientName" },
  { header: "Dată", key: "date" },
  { header: "Scadență", key: "dueDate" },
  { header: "Total fără TVA", key: "totalWithoutVAT" },
  { header: "TVA", key: "vat" },
  { header: "Total", key: "total" },
  { header: "Status", key: "status" },
];

// ← ADĂUGAT: traducere status în română
const invoiceStatusLabel: Record<string, string> = {
  draft: "Ciornă",
  sent: "Trimisă",
  paid: "Plătită",
  overdue: "Restantă",
};

export default function FinancialReportsPage() {
  const { exportPDF, exportExcel, exportCSV } = useExport();

  const invoices = useMemo(() => getCollection<Invoice>(STORAGE_KEYS.invoices), []);

  const rows = useMemo(
    () =>
      invoices.map((inv) => ({
        ...inv,
        type: inv.type === "income" ? "Venit" : "Cheltuială",
        status: invoiceStatusLabel[inv.status], // ← ADĂUGAT: traducere status în export
      })),
    [invoices],
  );

  const exportOptions: ExportOptions = {
    // ← MODIFICAT
    filename: "raport-financiar",
    title: "Raport Financiar",
    columns: COLUMNS,
    rows: rows as unknown as Record<string, unknown>[], // ← MODIFICAT
  };

  const totalVenituri = invoices.filter((i) => i.type === "income").reduce((sum, i) => sum + i.total, 0);
  const totalCheltuieli = invoices.filter((i) => i.type === "expense").reduce((sum, i) => sum + i.total, 0);

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">Rapoarte Financiare</h1>
      </Header>
      <Main>
        {/* KPI sumar */}
        <div className="grid gap-4 sm:grid-cols-3 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Total Venituri</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalVenituri)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Total Cheltuieli</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-500">{formatCurrency(totalCheltuieli)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Balanță</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${totalVenituri - totalCheltuieli >= 0 ? "text-green-600" : "text-red-500"}`}>{formatCurrency(totalVenituri - totalCheltuieli)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabel + Export */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Toate Facturile</CardTitle>
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
            {invoices.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nu există facturi înregistrate.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nr. Factură</TableHead>
                    <TableHead>Tip</TableHead>
                    <TableHead>Client/Furnizor</TableHead>
                    <TableHead>Dată</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell>{inv.number}</TableCell>
                      <TableCell>{inv.type === "income" ? "Venit" : "Cheltuială"}</TableCell>
                      <TableCell>{inv.clientName}</TableCell>
                      <TableCell>{inv.date}</TableCell>
                      <TableCell>{formatCurrency(inv.total)}</TableCell>
                      <TableCell>{invoiceStatusLabel[inv.status]}</TableCell> {/* ← MODIFICAT */}
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
