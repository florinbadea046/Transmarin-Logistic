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
import Papa from "papaparse";
import type { LeaveRequest } from "@/modules/hr/types";

type LeaveRow = LeaveRequest & { employeeName: string };

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

const TYPE_LABELS: Record<LeaveRequest["type"], string> = {
  annual: "Concediu anual",
  sick: "Medical",
  unpaid: "Neplata",
  other: "Altul",
};

const STATUS_LABELS: Record<LeaveRequest["status"], string> = {
  pending: "In asteptare",
  approved: "Aprobat",
  rejected: "Respins",
};

const COLS = [
  { key: "employeeName", label: "Angajat" },
  { key: "type", label: "Tip" },
  { key: "startDate", label: "Data inceput" },
  { key: "endDate", label: "Data sfarsit" },
  { key: "days", label: "Zile" },
  { key: "status", label: "Status" },
  { key: "reason", label: "Motiv" },
] as const;

function getRowValue(row: LeaveRow, key: (typeof COLS)[number]["key"]): string {
  if (key === "type") return TYPE_LABELS[row.type];
  if (key === "status") return STATUS_LABELS[row.status];
  if (key === "reason") return row.reason ?? "";
  return String(row[key] ?? "");
}

function toExportRows(rows: LeaveRow[]) {
  return rows.map((row) =>
    Object.fromEntries(COLS.map((c) => [c.label, getRowValue(row, c.key)])),
  );
}

function exportPDF(rows: LeaveRow[]) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(13);
  doc.text(toPdfSafe("Transmarin Logistic — Concedii"), 14, 16);

  autoTable(doc, {
    head: [COLS.map((c) => toPdfSafe(c.label))],
    body: rows.map((row) => COLS.map((c) => toPdfSafe(getRowValue(row, c.key)))),
    startY: 22,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 30, 30] },
  });

  doc.save("concedii.pdf");
}

function exportExcel(rows: LeaveRow[]) {
  const ws = XLSX.utils.json_to_sheet(toExportRows(rows));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Concedii");
  XLSX.writeFile(wb, "concedii.xlsx");
}

function exportCSV(rows: LeaveRow[]) {
  const csv = Papa.unparse(toExportRows(rows));
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "concedii.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

type Props = {
  rows: LeaveRow[];
};

export function LeavesExportMenu({ rows }: Props) {
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
          onClick={() => exportPDF(rows)}
        >
          Export PDF
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => exportExcel(rows)}
        >
          Export Excel
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => exportCSV(rows)}
        >
          Export CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
