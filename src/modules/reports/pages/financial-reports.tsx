import { useState, useMemo } from "react";
import { parseISO, startOfDay, endOfDay } from "date-fns";
import { Download, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { TopNav } from "@/components/layout/top-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useLocation } from "@tanstack/react-router";

import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Invoice } from "@/modules/accounting/types";
import { useMobile } from "@/hooks/use-mobile";

import {
  formatCurrency,
  buildBarData,
  buildPieData,
  statusColors,
  exportPDF,
  exportExcel,
} from "./_components/financial-reports-utils";
import { FinancialFilters } from "./_components/financial-reports-filters";
import { FinancialKPI } from "./_components/financial-reports-kpi";
import { FinancialCharts } from "./_components/financial-reports-charts";

// ── Main Component ─────────────────────────────────────────
export default function FinancialReportsPage() {
  const { t } = useTranslation();
  const isMobile = useMobile(640);
  const { pathname } = useLocation();
  const [exporting, setExporting] = useState(false);
  const [exportingXlsx, setExportingXlsx] = useState(false);

  const allInvoices = useMemo(() => getCollection<Invoice>(STORAGE_KEYS.invoices), []);

  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [tipFilter, setTipFilter] = useState("toate");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const filtered = useMemo(() => {
    return allInvoices.filter((inv) => {
      if (tipFilter !== "toate" && inv.type !== tipFilter) return false;
      if (startDate || endDate) {
        try {
          const d = parseISO(inv.date);
          if (startDate && d < startOfDay(startDate)) return false;
          if (endDate && d > endOfDay(endDate)) return false;
        } catch { return false; }
      }
      return true;
    });
  }, [allInvoices, startDate, endDate, tipFilter]);

  const totalVenituri = useMemo(() =>
    filtered.filter((i) => i.type === "income").reduce((s, i) => s + i.total, 0), [filtered]);
  const totalCheltuieli = useMemo(() =>
    filtered.filter((i) => i.type === "expense").reduce((s, i) => s + i.total, 0), [filtered]);
  const balanta = totalVenituri - totalCheltuieli;

  const barData = useMemo(() => buildBarData(filtered), [filtered]);
  const pieData = useMemo(() => buildPieData(filtered, t), [filtered, t]);

  const columns = useMemo<ColumnDef<Invoice>[]>(() => [
    {
      accessorKey: "number",
      header: t("financialReports.invoiceNr"),
      cell: ({ row }) => <span className="font-medium">{row.original.number}</span>,
    },
    {
      accessorKey: "type",
      header: t("financialReports.type"),
      cell: ({ row }) => (
        <Badge variant="outline" className={row.original.type === "income"
          ? "border-blue-500/30 text-blue-400"
          : "border-orange-500/30 text-orange-400"}>
          {row.original.type === "income" ? t("financialReports.typeIncome") : t("financialReports.typeExpense")}
        </Badge>
      ),
    },
    {
      accessorKey: "clientName",
      header: t("financialReports.client"),
    },
    {
      accessorKey: "date",
      header: t("financialReports.date"),
    },
    {
      accessorKey: "total",
      header: t("financialReports.total"),
      cell: ({ row }) => (
        <span className={row.original.type === "income" ? "text-green-400 font-semibold" : "text-red-400 font-semibold"}>
          {formatCurrency(row.original.total)}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: t("financialReports.status"),
      cell: ({ row }) => (
        <Badge className={`border ${statusColors[row.original.status] ?? ""}`}>
          {t(`financialReports.status_${row.original.status}`)}
        </Badge>
      ),
    },
  ], [t]);

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  const handleExportPDF = () => {
    setExporting(true);
    try { exportPDF(filtered, totalVenituri, totalCheltuieli, balanta, startDate, endDate, t); }
    finally { setExporting(false); }
  };

  const handleExportExcel = () => {
    setExportingXlsx(true);
    try { exportExcel(filtered, t); }
    finally { setExportingXlsx(false); }
  };

  const topNavLinks = [
    { title: t("sidebar.reports.transport"), href: "/reports/transport", isActive: pathname === "/reports/transport" },
    { title: t("sidebar.reports.financial"), href: "/reports/financial", isActive: pathname === "/reports/financial" || pathname === "/reports" },
    { title: t("sidebar.reports.fleet"), href: "/reports/fleet", isActive: pathname === "/reports/fleet" },
  ];

  return (
    <>
      <Header>
        <TopNav links={topNavLinks} />
      </Header>

      <Main>
        {/* Titlu + Export */}
        <div className={cn("mb-6 flex gap-3", isMobile ? "flex-col" : "items-center justify-between")}>
          <div>
            <h1 className="text-xl font-bold">{t("financialReports.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("financialReports.subtitle")}</p>
          </div>
          <div className={cn("flex gap-2", isMobile ? "w-full" : "")}>
            <Button size="sm" variant="outline" disabled={exportingXlsx} onClick={handleExportExcel} className={isMobile ? "flex-1" : ""}>
              {exportingXlsx ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Excel
            </Button>
            <Button size="sm" disabled={exporting} onClick={handleExportPDF} className={isMobile ? "flex-1" : ""}>
              {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {exporting ? t("financialReports.exporting") : t("financialReports.exportPdf")}
            </Button>
          </div>
        </div>

        {/* Filtre */}
        <FinancialFilters
          startDate={startDate}
          endDate={endDate}
          onStartDate={setStartDate}
          onEndDate={setEndDate}
          tipFilter={tipFilter}
          onTipFilter={setTipFilter}
          onReset={() => { setStartDate(undefined); setEndDate(undefined); setTipFilter("toate"); }}
          hasFilters={!!(startDate || endDate || tipFilter !== "toate")}
          count={filtered.length}
          isMobile={isMobile}
        />

        {/* KPI Cards */}
        <FinancialKPI
          totalVenituri={totalVenituri}
          totalCheltuieli={totalCheltuieli}
          balanta={balanta}
          invoiceCount={filtered.length}
          isMobile={isMobile}
        />

        <Separator className="mb-6" />

        {/* Grafice */}
        <FinancialCharts barData={barData} pieData={pieData} isMobile={isMobile} />

        {/* Tabel TanStack */}
        <Card>
          <CardHeader className={cn("flex gap-3", isMobile ? "flex-col" : "flex-row items-center justify-between")}>
            <CardTitle className="text-sm font-medium">{t("financialReports.invoicesTable")}</CardTitle>
            <Input
              placeholder={t("financialReports.searchPlaceholder")}
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className={isMobile ? "w-full" : "w-64"}
            />
          </CardHeader>
          <CardContent>
            {/* Desktop */}
            <div className="hidden md:block rounded-md border">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((hg) => (
                    <TableRow key={hg.id}>
                      {hg.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          className={header.column.getCanSort() ? "cursor-pointer select-none" : ""}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{ asc: " ↑", desc: " ↓" }[header.column.getIsSorted() as string] ?? ""}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                        {t("financialReports.noResults")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {table.getRowModel().rows.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">{t("financialReports.noResults")}</p>
              ) : (
                table.getRowModel().rows.map((row) => {
                  const inv = row.original;
                  return (
                    <div key={inv.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">{inv.number}</span>
                        <Badge className={`border ${statusColors[inv.status] ?? ""}`}>
                          {t(`financialReports.status_${inv.status}`)}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">{inv.clientName}</div>
                      <div className="flex justify-between text-sm">
                        <Badge variant="outline" className={inv.type === "income"
                          ? "border-blue-500/30 text-blue-400"
                          : "border-orange-500/30 text-orange-400"}>
                          {inv.type === "income" ? t("financialReports.typeIncome") : t("financialReports.typeExpense")}
                        </Badge>
                        <span className={inv.type === "income" ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
                          {formatCurrency(inv.total)}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">{inv.date}</div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination */}
            <div className={cn("flex items-center gap-2 mt-4", isMobile ? "flex-col" : "justify-between")}>
              <span className="text-xs text-muted-foreground">
                {t("financialReports.pagination", {
                  from: table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1,
                  to: Math.min(
                    (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                    table.getFilteredRowModel().rows.length,
                  ),
                  total: table.getFilteredRowModel().rows.length,
                })}
              </span>
              <div className="flex gap-2">
                <Select
                  value={String(table.getState().pagination.pageSize)}
                  onValueChange={(v) => table.setPageSize(Number(v))}
                >
                  <SelectTrigger className="w-20 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 20].map((s) => (
                      <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}>{"<"}</Button>
                <Button size="sm" variant="outline" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>{">"}</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </Main>
    </>
  );
}
