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
import { useTranslation } from "react-i18next";

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

type ExportLabels = {
  pdfTitle: string;
  fileName: string;
  cols: Record<string, string>;
  types: Record<LeaveRequest["type"], string>;
  status: Record<LeaveRequest["status"], string>;
};

function buildCols(labels: ExportLabels) {
  return [
    { key: "employeeName" as const, label: labels.cols.employee },
    { key: "type" as const, label: labels.cols.type },
    { key: "startDate" as const, label: labels.cols.startDate },
    { key: "endDate" as const, label: labels.cols.endDate },
    { key: "days" as const, label: labels.cols.days },
    { key: "status" as const, label: labels.cols.status },
    { key: "reason" as const, label: labels.cols.reason },
  ];
}

type ColKey = "employeeName" | "type" | "startDate" | "endDate" | "days" | "status" | "reason";

function getRowValue(row: LeaveRow, key: ColKey, labels: ExportLabels): string {
  if (key === "type") return labels.types[row.type];
  if (key === "status") return labels.status[row.status];
  if (key === "reason") return row.reason ?? "";
  return String(row[key] ?? "");
}

function toExportRows(rows: LeaveRow[], labels: ExportLabels) {
  const cols = buildCols(labels);
  return rows.map((row) =>
    Object.fromEntries(cols.map((c) => [c.label, getRowValue(row, c.key, labels)])),
  );
}

function exportPDF(rows: LeaveRow[], labels: ExportLabels) {
  const cols = buildCols(labels);
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(13);
  doc.text(toPdfSafe(labels.pdfTitle), 14, 16);

  autoTable(doc, {
    head: [cols.map((c) => toPdfSafe(c.label))],
    body: rows.map((row) => cols.map((c) => toPdfSafe(getRowValue(row, c.key, labels)))),
    startY: 22,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 30, 30] },
  });

  doc.save(`${labels.fileName}.pdf`);
}

function exportExcel(rows: LeaveRow[], labels: ExportLabels) {
  const ws = XLSX.utils.json_to_sheet(toExportRows(rows, labels));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, labels.fileName);
  XLSX.writeFile(wb, `${labels.fileName}.xlsx`);
}

function exportCSV(rows: LeaveRow[], labels: ExportLabels) {
  const csv = Papa.unparse(toExportRows(rows, labels));
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${labels.fileName}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

type Props = {
  rows: LeaveRow[];
};

export function LeavesExportMenu({ rows }: Props) {
  const { t } = useTranslation();
  const isEmpty = rows.length === 0;

  const labels: ExportLabels = {
    pdfTitle: t("leavesExport.pdfTitle"),
    fileName: t("leavesExport.fileName"),
    cols: {
      employee: t("leavesExport.cols.employee"),
      type: t("leavesExport.cols.type"),
      startDate: t("leavesExport.cols.startDate"),
      endDate: t("leavesExport.cols.endDate"),
      days: t("leavesExport.cols.days"),
      status: t("leavesExport.cols.status"),
      reason: t("leavesExport.cols.reason"),
    },
    types: {
      annual: t("leavesExport.types.annual"),
      sick: t("leavesExport.types.sick"),
      unpaid: t("leavesExport.types.unpaid"),
      other: t("leavesExport.types.other"),
    },
    status: {
      pending: t("leavesExport.status.pending"),
      approved: t("leavesExport.status.approved"),
      rejected: t("leavesExport.status.rejected"),
    },
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isEmpty}>
          <Download className="h-3.5 w-3.5 mr-1.5" />
          {t("leaves.export.button")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => exportPDF(rows, labels)}
        >
          {t("leaves.export.pdf")}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => exportExcel(rows, labels)}
        >
          {t("leaves.export.excel")}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => exportCSV(rows, labels)}
        >
          {t("leaves.export.csv")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
