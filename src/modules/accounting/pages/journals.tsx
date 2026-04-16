// Jurnale Contabile — tab Vanzari / Cumparari, cu totaluri lunare si export PDF/Excel.

import { useMemo, useState } from "react";
import { format, parse } from "date-fns";
import { FileSpreadsheet, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import { formatCurrency, formatDate, getDateLocale } from "@/utils/format";
import { exportToPdf } from "@/utils/exports/export-pdf";
import { exportToExcel } from "@/utils/exports/export-excel";
import type { Invoice } from "@/modules/accounting/types";
import { getUnifiedInvoices } from "@/modules/accounting/utils/invoices-store";

// ── Types & config ─────────────────────────────────────────

type JournalKind = "sales" | "purchases";

interface JournalMeta {
  titleKey: string;
  partnerLabelKey: string;
  filenameStem: string;
  invoiceType: Invoice["type"];
  accent: string;
}

const JOURNAL_META: Record<JournalKind, JournalMeta> = {
  sales: {
    titleKey: "accountingJournals.tabs.sales",
    partnerLabelKey: "accountingJournals.partner.client",
    filenameStem: "Jurnal_Vanzari",
    invoiceType: "income",
    accent: "text-green-600",
  },
  purchases: {
    titleKey: "accountingJournals.tabs.purchases",
    partnerLabelKey: "accountingJournals.partner.supplier",
    filenameStem: "Jurnal_Cumparari",
    invoiceType: "expense",
    accent: "text-red-500",
  },
};

interface JournalView extends JournalMeta {
  kind: JournalKind;
  rows: Invoice[];
  baseTotal: number;
  vatTotal: number;
  grandTotal: number;
}

interface MonthOption {
  value: string;
  label: string;
}

interface SummaryCard {
  labelKey: string;
  value: number;
  accent: string;
}

const MONTH_KEY = "yyyy-MM";

// ── Helpers ────────────────────────────────────────────────

function monthKey(date: Date | string): string {
  if (typeof date === "string") return date.slice(0, 7);
  return format(date, MONTH_KEY);
}

function formatMonthLabel(key: string): string {
  const d = parse(key, MONTH_KEY, new Date());
  const label = format(d, "LLLL yyyy", { locale: getDateLocale() });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function buildMonthOptions(invoices: Invoice[]): MonthOption[] {
  const keys = new Set<string>([monthKey(new Date())]);
  for (const inv of invoices) {
    if (inv.date) keys.add(monthKey(inv.date));
  }
  return Array.from(keys)
    .sort((a, b) => b.localeCompare(a))
    .map((value) => ({ value, label: formatMonthLabel(value) }));
}

function buildView(kind: JournalKind, monthInvoices: Invoice[]): JournalView {
  const meta = JOURNAL_META[kind];
  const rows = monthInvoices.filter((inv) => inv.type === meta.invoiceType);
  return {
    ...meta,
    kind,
    rows,
    baseTotal: rows.reduce((s, r) => s + (r.totalWithoutVAT ?? 0), 0),
    vatTotal: rows.reduce((s, r) => s + (r.vat ?? 0), 0),
    grandTotal: rows.reduce((s, r) => s + (r.total ?? 0), 0),
  };
}

// ── Componenta ─────────────────────────────────────────────

export default function JournalsPage() {
  const { t, i18n } = useTranslation();
  const allInvoices = useMemo(() => getUnifiedInvoices(), []);
  const monthOptions = useMemo(
    () => buildMonthOptions(allInvoices),
    [allInvoices, i18n.language],
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(
    () => monthOptions[0]?.value ?? monthKey(new Date()),
  );
  const [kind, setKind] = useState<JournalKind>("sales");

  const monthLabel = monthOptions.find((o) => o.value === selectedMonth)?.label ?? selectedMonth;

  const monthInvoices = useMemo(
    () => allInvoices.filter((inv) => monthKey(inv.date) === selectedMonth),
    [allInvoices, selectedMonth],
  );

  const sales = useMemo(() => buildView("sales", monthInvoices), [monthInvoices]);
  const purchases = useMemo(() => buildView("purchases", monthInvoices), [monthInvoices]);
  const activeView = kind === "sales" ? sales : purchases;

  const summaryCards: SummaryCard[] = [
    { labelKey: "accountingJournals.cards.salesBase", value: sales.baseTotal, accent: sales.accent },
    { labelKey: "accountingJournals.cards.vatCollected", value: sales.vatTotal, accent: sales.accent },
    { labelKey: "accountingJournals.cards.purchasesBase", value: purchases.baseTotal, accent: purchases.accent },
    { labelKey: "accountingJournals.cards.vatDeductible", value: purchases.vatTotal, accent: purchases.accent },
  ];

  // ── Export ────────────────────────────────────────────────

  const handleExportExcel = () => buildExcelExport(activeView, selectedMonth, t);
  const handleExportPdf = () => buildPdfExport(activeView, selectedMonth, monthLabel, t);

  // ── Render ────────────────────────────────────────────────

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">{t("accountingJournals.title")}</h1>
      </Header>

      <Main className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map((card) => (
            <Card key={card.labelKey}>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t(card.labelKey)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${card.accent}`}>{formatCurrency(card.value)}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <CardTitle className="text-sm font-semibold">
                {t("accountingJournals.registerFor", { month: monthLabel })}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {t("accountingJournals.selectPrompt")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-full min-w-[180px] sm:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleExportPdf} className="gap-1.5">
                <FileText className="h-4 w-4" />
                {t("accountingJournals.export.pdf")}
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-1.5">
                <FileSpreadsheet className="h-4 w-4" />
                {t("accountingJournals.export.excel")}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={kind} onValueChange={(v) => setKind(v as JournalKind)}>
              <TabsList className="mb-4">
                <TabsTrigger value="sales">{t(JOURNAL_META.sales.titleKey)}</TabsTrigger>
                <TabsTrigger value="purchases">{t(JOURNAL_META.purchases.titleKey)}</TabsTrigger>
              </TabsList>

              <TabsContent value="sales">
                <JournalTable view={sales} />
              </TabsContent>
              <TabsContent value="purchases">
                <JournalTable view={purchases} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </Main>
    </>
  );
}

// ── Export helpers ─────────────────────────────────────────

function buildExcelExport(view: JournalView, selectedMonth: string, t: TFunction) {
  const partnerLabel = t(view.partnerLabelKey);
  exportToExcel<Invoice>({
    filename: `${view.filenameStem}_${selectedMonth}.xlsx`,
    sheetName: view.filenameStem,
    columns: [
      { header: t("accountingJournals.columns.invoiceNumber"), accessor: (r) => r.number },
      { header: t("accountingJournals.columns.date"), accessor: (r) => r.date },
      { header: partnerLabel, accessor: (r) => r.clientName },
      { header: t("accountingJournals.columns.base"), accessor: (r) => r.totalWithoutVAT },
      { header: t("accountingJournals.columns.vat"), accessor: (r) => r.vat },
      { header: t("accountingJournals.columns.total"), accessor: (r) => r.total },
    ],
    rows: view.rows,
    footerRow: [t("accountingJournals.totalFooter"), "", "", view.baseTotal, view.vatTotal, view.grandTotal],
  });
}

function buildPdfExport(view: JournalView, selectedMonth: string, monthLabel: string, t: TFunction) {
  const partnerLabel = t(view.partnerLabelKey);
  exportToPdf<Invoice>({
    filename: `${view.filenameStem}_${selectedMonth}.pdf`,
    title: t(view.titleKey),
    subtitle: t("accountingJournals.export.monthSubtitle", { month: monthLabel }),
    orientation: "landscape",
    columns: [
      { header: t("accountingJournals.columns.invoiceNumber"), accessor: (r) => r.number },
      { header: t("accountingJournals.columns.date"), accessor: (r) => r.date },
      { header: partnerLabel, accessor: (r) => r.clientName },
      { header: t("accountingJournals.columns.base"), accessor: (r) => formatCurrency(r.totalWithoutVAT) },
      { header: t("accountingJournals.columns.vat"), accessor: (r) => formatCurrency(r.vat) },
      { header: t("accountingJournals.columns.total"), accessor: (r) => formatCurrency(r.total) },
    ],
    rows: view.rows,
    footerRow: [
      { content: t("accountingJournals.totalFooter"), colSpan: 3, bold: true, align: "right" },
      { content: formatCurrency(view.baseTotal), bold: true, align: "right" },
      { content: formatCurrency(view.vatTotal), bold: true, align: "right" },
      { content: formatCurrency(view.grandTotal), bold: true, align: "right" },
    ],
  });
}

// ── Tabel jurnal ───────────────────────────────────────────

function JournalTable({ view }: { view: JournalView }) {
  const { t } = useTranslation();
  const { rows, partnerLabelKey, baseTotal, vatTotal, grandTotal } = view;
  const partnerLabel = t(partnerLabelKey);
  const cols = {
    number: t("accountingJournals.columns.invoiceNumber"),
    date: t("accountingJournals.columns.date"),
    base: t("accountingJournals.columns.base"),
    vat: t("accountingJournals.columns.vat"),
    total: t("accountingJournals.columns.total"),
  };

  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {t("accountingJournals.emptyMonth")}
      </p>
    );
  }

  return (
    <>
      <div className="hidden md:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{cols.number}</TableHead>
              <TableHead>{cols.date}</TableHead>
              <TableHead>{partnerLabel}</TableHead>
              <TableHead className="text-right">{cols.base}</TableHead>
              <TableHead className="text-right">{cols.vat}</TableHead>
              <TableHead className="text-right">{cols.total}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.number}</TableCell>
                <TableCell>{formatDate(r.date)}</TableCell>
                <TableCell>{r.clientName}</TableCell>
                <TableCell className="text-right">{formatCurrency(r.totalWithoutVAT)}</TableCell>
                <TableCell className="text-right">{formatCurrency(r.vat)}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(r.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={3} className="font-semibold">
                {t("accountingJournals.subtotalMonth")}
              </TableCell>
              <TableCell className="text-right font-semibold">{formatCurrency(baseTotal)}</TableCell>
              <TableCell className="text-right font-semibold">{formatCurrency(vatTotal)}</TableCell>
              <TableCell className="text-right font-semibold">{formatCurrency(grandTotal)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        {rows.map((r) => (
          <div key={r.id} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">{r.number}</p>
              <p className="text-xs text-muted-foreground">{formatDate(r.date)}</p>
            </div>
            <p className="text-sm text-muted-foreground">{r.clientName}</p>
            <div className="grid grid-cols-2 gap-1 border-t pt-2 text-sm">
              <span className="text-muted-foreground">{cols.base}</span>
              <span className="text-right">{formatCurrency(r.totalWithoutVAT)}</span>
              <span className="text-muted-foreground">{cols.vat}</span>
              <span className="text-right">{formatCurrency(r.vat)}</span>
              <span className="text-muted-foreground">{cols.total}</span>
              <span className="text-right font-medium">{formatCurrency(r.total)}</span>
            </div>
          </div>
        ))}
        <div className="rounded-lg border bg-muted/40 p-3 space-y-1">
          <p className="text-sm font-semibold">{t("accountingJournals.subtotalMonth")}</p>
          <div className="grid grid-cols-2 gap-1 text-sm">
            <span className="text-muted-foreground">{cols.base}</span>
            <span className="text-right font-semibold">{formatCurrency(baseTotal)}</span>
            <span className="text-muted-foreground">{cols.vat}</span>
            <span className="text-right font-semibold">{formatCurrency(vatTotal)}</span>
            <span className="text-muted-foreground">{cols.total}</span>
            <span className="text-right font-semibold">{formatCurrency(grandTotal)}</span>
          </div>
        </div>
      </div>
    </>
  );
}
