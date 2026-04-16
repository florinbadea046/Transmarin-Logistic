import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download } from "lucide-react";
import type { PayrollRow } from "../payroll/payroll-shared";
import { useTranslation } from "react-i18next";
import { exportToPdf, exportToExcel, type PdfColumn } from "@/utils/exports";

type TFunction = (key: string) => string;

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

const CURRENCY_KEYS = new Set<keyof PayrollRow>([
  "salary",
  "diurna",
  "bonusuri",
  "amenzi",
  "oreSuplimentare",
  "totalNet",
]);

function buildColumns(t: TFunction): PdfColumn<PayrollRow>[] {
  const cols: { key: keyof PayrollRow; label: string }[] = [
    { key: "name", label: t("payroll.columns.employee") },
    { key: "department", label: t("payroll.columns.department") },
    { key: "salary", label: t("payroll.columns.baseSalary") },
    { key: "diurna", label: t("payroll.columns.diurna") },
    { key: "bonusuri", label: t("payroll.columns.bonuses") },
    { key: "amenzi", label: t("payroll.columns.fines") },
    { key: "oreSuplimentare", label: t("payroll.columns.overtime") },
    { key: "totalNet", label: t("payroll.columns.totalNet") },
  ];

  return cols.map((c) => ({
    header: c.label,
    accessor: (row: PayrollRow) => {
      const val = row[c.key];
      return CURRENCY_KEYS.has(c.key) ? formatRON(Number(val)) : String(val ?? "");
    },
  }));
}

function exportPDF(
  rows: PayrollRow[],
  selectedMonth: string,
  t: TFunction,
  locale: string,
) {
  const monthLabel = getMonthLabel(selectedMonth, locale);
  const totalNet = rows.reduce((sum, r) => sum + r.totalNet, 0);
  const columns = buildColumns(t);

  exportToPdf({
    filename: `${t("payroll.export.fileName")}-${selectedMonth}`,
    title: `${t("payroll.export.pdfTitle")} ${monthLabel}`,
    columns,
    rows,
    orientation: "landscape",
    showHeader: false,
    footerRow: [
      {
        content: t("payroll.export.totalLabel"),
        colSpan: columns.length - 1,
        align: "right",
        bold: true,
      },
      {
        content: formatRON(totalNet),
        bold: true,
      },
    ],
  });
}

function exportExcel(
  rows: PayrollRow[],
  selectedMonth: string,
  t: TFunction,
  locale: string,
) {
  const monthLabel = getMonthLabel(selectedMonth, locale);
  const totalNet = rows.reduce((sum, r) => sum + r.totalNet, 0);

  const columns: { header: string; accessor: (r: PayrollRow) => string | number }[] = [
    { header: t("payroll.columns.employee"), accessor: (r) => r.name },
    { header: t("payroll.columns.department"), accessor: (r) => r.department },
    { header: t("payroll.columns.baseSalary"), accessor: (r) => r.salary },
    { header: t("payroll.columns.diurna"), accessor: (r) => r.diurna },
    { header: t("payroll.columns.bonuses"), accessor: (r) => r.bonusuri },
    { header: t("payroll.columns.fines"), accessor: (r) => r.amenzi },
    { header: t("payroll.columns.overtime"), accessor: (r) => r.oreSuplimentare },
    { header: t("payroll.columns.totalNet"), accessor: (r) => r.totalNet },
  ];

  const footerRow: (string | number)[] = Array(columns.length).fill("");
  footerRow[columns.length - 2] = t("payroll.export.totalLabel");
  footerRow[columns.length - 1] = totalNet;

  exportToExcel({
    filename: `${t("payroll.export.fileName")}-${selectedMonth}`,
    sheetName: monthLabel,
    columns,
    rows,
    footerRow,
  });
}

type Props = {
  rows: PayrollRow[];
  selectedMonth: string;
};

export function PayrollExportMenu({ rows, selectedMonth }: Props) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith("en") ? "en-GB" : "ro-RO";
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
          onClick={() => exportPDF(rows, selectedMonth, t, locale)}
        >
          {t("payroll.export.pdf")}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => exportExcel(rows, selectedMonth, t, locale)}
        >
          {t("payroll.export.excel")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
