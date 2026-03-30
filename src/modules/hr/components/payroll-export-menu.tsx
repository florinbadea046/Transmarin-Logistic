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

function getMonthLabel(selectedMonth: string): string {
  const [year, month] = selectedMonth.split("-");
  const y = Number(year);
  const m = Number(month);
  if (!selectedMonth || isNaN(y) || isNaN(m)) return selectedMonth;
  const d = new Date(y, m - 1, 1);
  const label = d.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const COLS: { key: keyof PayrollRow; label: string }[] = [
  { key: "name", label: "Angajat" },
  { key: "department", label: "Departament" },
  { key: "salary", label: "Salariu baza" },
  { key: "diurna", label: "Diurna" },
  { key: "bonusuri", label: "Bonusuri" },
  { key: "amenzi", label: "Amenzi" },
  { key: "oreSuplimentare", label: "Ore supl." },
  { key: "totalNet", label: "Total net" },
];

const CURRENCY_KEYS = new Set<keyof PayrollRow>([
  "salary",
  "diurna",
  "bonusuri",
  "amenzi",
  "oreSuplimentare",
  "totalNet",
]);

function exportPDF(rows: PayrollRow[], selectedMonth: string) {
  const monthLabel = getMonthLabel(selectedMonth);
  const title = `Transmarin Logistic — Stat de plata ${monthLabel}`;
  const totalNet = rows.reduce((sum, r) => sum + r.totalNet, 0);

  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(13);
  doc.text(toPdfSafe(title), 14, 16);

  autoTable(doc, {
    head: [COLS.map((c) => toPdfSafe(c.label))],
    body: rows.map((row) =>
      COLS.map((c) => {
        const val = row[c.key];
        return CURRENCY_KEYS.has(c.key) ? formatRON(Number(val)) : toPdfSafe(val);
      }),
    ),
    foot: [
      [
        {
          content: "Total general",
          colSpan: COLS.length - 1,
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

  doc.save(`stat-plata-${selectedMonth}.pdf`);
}

function exportExcel(rows: PayrollRow[], selectedMonth: string) {
  const monthLabel = getMonthLabel(selectedMonth);
  const headers = COLS.map((c) => c.label);

  const data = rows.map((row) =>
    COLS.map((c) => {
      const val = row[c.key];
      return CURRENCY_KEYS.has(c.key) ? Number(val) : String(val ?? "");
    }),
  );

  const totalNet = rows.reduce((sum, r) => sum + r.totalNet, 0);
  const totalRow = Array(COLS.length).fill("");
  totalRow[COLS.length - 2] = "Total general";
  totalRow[COLS.length - 1] = totalNet;

  const ws = XLSX.utils.aoa_to_sheet([headers, ...data, totalRow]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, monthLabel);
  XLSX.writeFile(wb, `stat-plata-${selectedMonth}.xlsx`);
}

type Props = {
  rows: PayrollRow[];
  selectedMonth: string;
};

export function PayrollExportMenu({ rows, selectedMonth }: Props) {
  const isEmpty = rows.length === 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isEmpty}>
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => exportPDF(rows, selectedMonth)}
        >
          Export PDF
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => exportExcel(rows, selectedMonth)}
        >
          Export Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
