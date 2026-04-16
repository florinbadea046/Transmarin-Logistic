import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download } from "lucide-react";
import type { LeaveRequest } from "@/modules/hr/types";
import { useTranslation } from "react-i18next";
import { exportToPdf, exportToExcel, exportToCsv } from "@/utils/exports";

type LeaveRow = LeaveRequest & { employeeName: string };

type ExportLabels = {
  pdfTitle: string;
  fileName: string;
  cols: Record<string, string>;
  types: Record<LeaveRequest["type"], string>;
  status: Record<LeaveRequest["status"], string>;
};

function buildColumns(labels: ExportLabels) {
  return [
    { header: labels.cols.employee, accessor: (r: LeaveRow) => r.employeeName },
    { header: labels.cols.type, accessor: (r: LeaveRow) => labels.types[r.type] },
    { header: labels.cols.startDate, accessor: (r: LeaveRow) => r.startDate },
    { header: labels.cols.endDate, accessor: (r: LeaveRow) => r.endDate },
    { header: labels.cols.days, accessor: (r: LeaveRow) => r.days },
    { header: labels.cols.status, accessor: (r: LeaveRow) => labels.status[r.status] },
    { header: labels.cols.reason, accessor: (r: LeaveRow) => r.reason ?? "" },
  ];
}

function exportPDF(rows: LeaveRow[], labels: ExportLabels) {
  exportToPdf({
    filename: labels.fileName,
    title: labels.pdfTitle,
    columns: buildColumns(labels),
    rows,
    orientation: "landscape",
  });
}

function exportExcel(rows: LeaveRow[], labels: ExportLabels) {
  exportToExcel({
    filename: labels.fileName,
    sheetName: labels.fileName,
    columns: buildColumns(labels),
    rows,
  });
}

function exportCSV(rows: LeaveRow[], labels: ExportLabels) {
  exportToCsv({
    filename: labels.fileName,
    columns: buildColumns(labels),
    rows,
  });
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
