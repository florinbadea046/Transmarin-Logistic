import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { PayrollRow } from "../payroll/payroll-shared";
import { useTranslation } from "react-i18next";

type TFunction = (key: string) => string;

function toPdfSafe(value: unknown): string {
  return String(value ?? "")
    .replace(/[ăĂ]/g, (c) => (c === "ă" ? "a" : "A"))
    .replace(/[âÂ]/g, (c) => (c === "â" ? "a" : "A"))
    .replace(/[îÎ]/g, (c) => (c === "î" ? "i" : "I"))
    .replace(/[șş]/g, "s")
    .replace(/[ȘŞ]/g, "S")
    .replace(/[țţ]/g, "t")
    .replace(/[ȚŢ]/g, "T");
}

function formatRON(value: number): string {
  return (
    value.toLocaleString("ro-RO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " RON"
  );
}

function getMonthLabel(selectedMonth: string, locale: string): string {
  const [year, month] = selectedMonth.split("-");
  const y = Number(year);
  const m = Number(month);
  if (!selectedMonth || isNaN(y) || isNaN(m)) return selectedMonth;
  const d = new Date(y, m - 1, 1);
  const label = d.toLocaleDateString(locale, { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function getCols(t: TFunction): { key: keyof PayrollRow; label: string }[] {
  return [
    { key: "name", label: t("payroll.columns.employee") },
    { key: "department", label: t("payroll.columns.department") },
    { key: "salary", label: t("payroll.columns.baseSalary") },
    { key: "diurna", label: t("payroll.columns.diurna") },
    { key: "bonusuri", label: t("payroll.columns.bonuses") },
    { key: "amenzi", label: t("payroll.columns.fines") },
    { key: "oreSuplimentare", label: t("payroll.columns.overtime") },
    { key: "totalNet", label: t("payroll.columns.totalNet") },
  ];
}

const CURRENCY_KEYS = new Set<keyof PayrollRow>([
  "salary",
  "diurna",
  "bonusuri",
  "amenzi",
  "oreSuplimentare",
  "totalNet",
]);

function exportPDF(
  rows: PayrollRow[],
  selectedMonth: string,
  t: TFunction,
  locale: string,
  cols: { key: keyof PayrollRow; label: string }[],
) {
  const monthLabel = getMonthLabel(selectedMonth, locale);
  const title = `${t("payroll.export.pdfTitle")} ${monthLabel}`;
  const totalNet = rows.reduce((sum, r) => sum + r.totalNet, 0);

  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(13);
  doc.text(toPdfSafe(title), 14, 16);

  autoTable(doc, {
    head: [cols.map((c) => toPdfSafe(c.label))],
    body: rows.map((row) =>
      cols.map((c) => {
        const val = row[c.key];
        return CURRENCY_KEYS.has(c.key) ? formatRON(Number(val)) : toPdfSafe(val);
      }),
    ),
    foot: [
      [
        {
          content: t("payroll.export.totalLabel"),
          colSpan: cols.length - 1,
          styles: { halign: "right" as const, fontStyle: "bold" as const },
        },
        { content: formatRON(totalNet), styles: { fontStyle: "bold" as const } },
      ],
    ],
    startY: 22,
    styles: { fontSize: 7 },
    headStyles: { fillColor: [30, 30, 30] },
    footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
    showFoot: "lastPage",
  });

  doc.save(`${t("payroll.export.fileName")}-${selectedMonth}.pdf`);
}

function exportExcel(
  rows: PayrollRow[],
  selectedMonth: string,
  t: TFunction,
  locale: string,
  cols: { key: keyof PayrollRow; label: string }[],
) {
  const monthLabel = getMonthLabel(selectedMonth, locale);
  const headers = cols.map((c) => c.label);

  const data = rows.map((row) =>
    cols.map((c) => {
      const val = row[c.key];
      return CURRENCY_KEYS.has(c.key) ? Number(val) : String(val ?? "");
    }),
  );

  const totalNet = rows.reduce((sum, r) => sum + r.totalNet, 0);
  const totalRow = Array(cols.length).fill("");
  totalRow[cols.length - 2] = t("payroll.export.totalLabel");
  totalRow[cols.length - 1] = totalNet;

  const ws = XLSX.utils.aoa_to_sheet([headers, ...data, totalRow]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, monthLabel);
  XLSX.writeFile(wb, `${t("payroll.export.fileName")}-${selectedMonth}.xlsx`);
}

type Props = {
  rows: PayrollRow[];
  selectedMonth: string;
};

export function PayrollExportMenu({ rows, selectedMonth }: Props) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith("en") ? "en-GB" : "ro-RO";
  const cols = React.useMemo(() => getCols(t), [t]);
  const isEmpty = rows.length === 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isEmpty}>
          <Download className="h-3.5 w-3.5 mr-1.5" />
          {t("payroll.export.button")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => exportPDF(rows, selectedMonth, t, locale, cols)}
        >
          {t("payroll.export.pdf")}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => exportExcel(rows, selectedMonth, t, locale, cols)}
        >
          {t("payroll.export.excel")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
