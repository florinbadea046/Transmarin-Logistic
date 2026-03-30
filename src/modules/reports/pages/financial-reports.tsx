import { useState, useMemo } from "react";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import { CalendarIcon, Download, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";
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
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useLocation } from "@tanstack/react-router";

import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Invoice } from "@/modules/accounting/types";
import { useMobile } from "@/hooks/use-mobile";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON" }).format(value);

function stripDiacritics(str: string): string {
  return str
    .replace(/[ăĂ]/g, (c) => c === "ă" ? "a" : "A")
    .replace(/[âÂ]/g, (c) => c === "â" ? "a" : "A")
    .replace(/[îÎ]/g, (c) => c === "î" ? "i" : "I")
    .replace(/[șşŞŠ]/g, (c) => c === c.toLowerCase() ? "s" : "S")
    .replace(/[țţŢŤ]/g, (c) => c === c.toLowerCase() ? "t" : "T");
}

function buildBarData(invoices: Invoice[]) {
  const map: Record<string, { luna: string; venituri: number; cheltuieli: number }> = {};
  for (const inv of invoices) {
    const luna = inv.date.slice(0, 7);
    if (!map[luna]) map[luna] = { luna, venituri: 0, cheltuieli: 0 };
    if (inv.type === "income") map[luna].venituri += inv.total;
    else map[luna].cheltuieli += inv.total;
  }
  return Object.values(map).sort((a, b) => a.luna.localeCompare(b.luna));
}

function buildPieData(invoices: Invoice[], t: TFunction) {
  const expenses = invoices.filter((i) => i.type === "expense");
  const map: Record<string, number> = {};
  for (const inv of expenses) {
    for (const item of inv.items) {
      const desc = item.description.toLowerCase();
      let category = t("financialReports.pie.other");
      if (desc.includes("combustibil") || desc.includes("fuel"))
        category = t("financialReports.pie.fuel");
      else if (desc.includes("service") || desc.includes("piese") || desc.includes("filtru") || desc.includes("placute"))
        category = t("financialReports.pie.maintenance");
      else if (desc.includes("salariu") || desc.includes("angajat"))
        category = t("financialReports.pie.salaries");
      else if (inv.clientName)
        category = inv.clientName.replace(/\bSRL\b|\bSA\b/g, "").trim();
      map[category] = (map[category] ?? 0) + item.total;
    }
  }
  return Object.entries(map)
    .map(([name, value]) => ({ name, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
}

function DatePicker({ date, onSelect, placeholder }: {
  date: Date | undefined;
  onSelect: (d: Date | undefined) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "dd.MM.yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={date} onSelect={(d) => { onSelect(d); setOpen(false); }} initialFocus />
      </PopoverContent>
    </Popover>
  );
}

function exportPDF(
  invoices: Invoice[],
  totalVenituri: number,
  totalCheltuieli: number,
  balanta: number,
  startDate: Date | undefined,
  endDate: Date | undefined,
  t: TFunction,
) {
  const doc = new jsPDF();
  const margin = 14;
  const rangeLabel = startDate
    ? `${format(startDate, "dd.MM.yyyy")}${endDate ? ` - ${format(endDate, "dd.MM.yyyy")}` : ""}`
    : t("financialReports.pdf.allData");

  doc.setFontSize(16);
  doc.text(t("financialReports.pdf.title"), margin, 16);
  doc.setFontSize(10);
  doc.text(`${t("financialReports.pdf.interval")}: ${stripDiacritics(rangeLabel)}`, margin, 24);
  doc.text(`${t("financialReports.pdf.generated")}: ${format(new Date(), "dd.MM.yyyy HH:mm")}`, margin, 30);

  let y = 40;
  doc.setFontSize(11);
  doc.text(`${t("financialReports.totalIncome")}: ${formatCurrency(totalVenituri)}`, margin, y); y += 6;
  doc.text(`${t("financialReports.totalExpenses")}: ${formatCurrency(totalCheltuieli)}`, margin, y); y += 6;
  doc.text(`${t("financialReports.balance")}: ${formatCurrency(balanta)}`, margin, y); y += 10;

  autoTable(doc, {
    startY: y,
    head: [[
      t("financialReports.invoiceNr"),
      t("financialReports.type"),
      t("financialReports.client"),
      t("financialReports.date"),
      t("financialReports.total"),
      t("financialReports.status"),
    ]],
    body: invoices.map((inv) => [
      inv.number,
      inv.type === "income" ? t("financialReports.typeIncome") : t("financialReports.typeExpense"),
      stripDiacritics(inv.clientName),
      inv.date,
      formatCurrency(inv.total),
      t(`financialReports.status_${inv.status}`),
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 30, 30] },
    margin: { left: margin, right: margin },
    didParseCell: (data) => {
      if (typeof data.cell.text[0] === "string")
        data.cell.text[0] = stripDiacritics(data.cell.text[0]);
    },
  });

  doc.save(`${t("financialReports.pdf.filename")}.pdf`);
}

function exportExcel(invoices: Invoice[], t: TFunction) {
  const rows = invoices.map((inv) => ({
    [t("financialReports.invoiceNr")]: inv.number,
    [t("financialReports.type")]: inv.type === "income" ? t("financialReports.typeIncome") : t("financialReports.typeExpense"),
    [t("financialReports.client")]: inv.clientName,
    [t("financialReports.date")]: inv.date,
    [t("financialReports.total")]: inv.total,
    [t("financialReports.status")]: t(`financialReports.status_${inv.status}`),
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, t("financialReports.title"));
  XLSX.writeFile(wb, `${t("financialReports.pdf.filename")}.xlsx`);
}

const statusColors: Record<string, string> = {
  paid: "bg-green-500/20 text-green-400 border-green-500/30",
  sent: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  overdue: "bg-red-500/20 text-red-400 border-red-500/30",
  draft: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

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

  const chartH = isMobile ? 200 : 260;

  return (
    <>
      <Header>
        <TopNav links={topNavLinks} />
      </Header>

      <Main>
        <div className={cn("mb-6 flex gap-3", isMobile ? "flex-col" : "items-center justify-between")}>
          <div>
            <h1 className="text-xl font-bold">{t("financialReports.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("financialReports.subtitle")}</p>
          </div>
          <div className={cn("flex gap-2", isMobile && "w-full")}>
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

        <div className={cn("mb-6 flex gap-3", isMobile ? "flex-col" : "flex-wrap items-end")}>
          <div className={cn("space-y-1", isMobile ? "w-full" : "")}>
            <Label className="text-xs text-muted-foreground">{t("financialReports.from")}</Label>
            <DatePicker date={startDate} onSelect={setStartDate} placeholder={t("financialReports.pickDate")} />
          </div>
          <div className={cn("space-y-1", isMobile ? "w-full" : "")}>
            <Label className="text-xs text-muted-foreground">{t("financialReports.to")}</Label>
            <DatePicker date={endDate} onSelect={setEndDate} placeholder={t("financialReports.pickDate")} />
          </div>
          <div className={cn("space-y-1", isMobile ? "w-full" : "")}>
            <Label className="text-xs text-muted-foreground">{t("financialReports.typeFilter")}</Label>
            <Select value={tipFilter} onValueChange={setTipFilter}>
              <SelectTrigger className={isMobile ? "w-full" : "w-[180px]"}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="toate">{t("financialReports.allTypes")}</SelectItem>
                <SelectItem value="income">{t("financialReports.typeIncome")}</SelectItem>
                <SelectItem value="expense">{t("financialReports.typeExpense")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(startDate || endDate || tipFilter !== "toate") && (
            <Button variant="ghost" size="sm"
              onClick={() => { setStartDate(undefined); setEndDate(undefined); setTipFilter("toate"); }}
              className={isMobile ? "w-full" : "self-end"}>
              {t("financialReports.resetFilters")}
            </Button>
          )}
          <span className={cn("text-xs text-muted-foreground", !isMobile && "ml-auto self-end mb-1")}>
            {t("financialReports.invoiceCountLabel", { count: filtered.length })}
          </span>
        </div>

        <div className={cn("mb-6 grid gap-4", isMobile ? "grid-cols-2" : "grid-cols-4")}>
          {[
            { label: t("financialReports.totalIncome"), value: formatCurrency(totalVenituri), color: "text-green-400" },
            { label: t("financialReports.totalExpenses"), value: formatCurrency(totalCheltuieli), color: "text-red-400" },
            { label: t("financialReports.balance"), value: formatCurrency(balanta), color: balanta >= 0 ? "text-green-400" : "text-red-400" },
            { label: t("financialReports.invoiceCount"), value: filtered.length, color: "text-foreground" },
          ].map(({ label, value, color }) => (
            <Card key={label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Separator className="mb-6" />

        <div className={cn("grid gap-6 mb-6", isMobile ? "grid-cols-1" : "grid-cols-2")}>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">{t("financialReports.charts.incomeVsExpenses")}</CardTitle>
            </CardHeader>
            <CardContent>
              {barData.length === 0
                ? <p className="py-10 text-center text-sm text-muted-foreground">{t("financialReports.noResults")}</p>
                : (
                  <ResponsiveContainer width="100%" height={chartH}>
                    <BarChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: isMobile ? 20 : 40 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="luna" tick={{ fontSize: isMobile ? 10 : 11 }} angle={-30} textAnchor="end" interval={0} />
                      <YAxis tick={{ fontSize: isMobile ? 10 : 11 }} width={isMobile ? 45 : 60} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(val) => [formatCurrency(val as number)]} />
                      <Legend wrapperStyle={{ fontSize: isMobile ? "10px" : "11px" }} />
                      <Bar dataKey="venituri" name={t("financialReports.typeIncome")} fill={COLORS[1]} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="cheltuieli" name={t("financialReports.typeExpense")} fill={COLORS[3]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">{t("financialReports.charts.expenseBreakdown")}</CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length === 0
                ? <p className="py-10 text-center text-sm text-muted-foreground">{t("financialReports.noResults")}</p>
                : (
                  <ResponsiveContainer width="100%" height={isMobile ? 260 : 320}>
                    <PieChart>
                      <Pie
                        data={pieData} dataKey="value" nameKey="name"
                        cx="50%" cy={isMobile ? "38%" : "32%"}
                        outerRadius={isMobile ? 60 : 75}
                        label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(val) => [formatCurrency(val as number)]} />
                      <Legend
                        iconSize={8} layout="vertical" align="center" verticalAlign="bottom"
                        wrapperStyle={{ fontSize: isMobile ? "10px" : "11px", lineHeight: "1.6", paddingTop: "8px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
            </CardContent>
          </Card>
        </div>

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