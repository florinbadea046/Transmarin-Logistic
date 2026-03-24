import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Employee } from "@/modules/hr/types";
import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import Papa from "papaparse";

function toPdfSafeText(value: unknown) {
  return String(value ?? "")
    .replace(/[ăĂ]/g, (c) => c === "a" ? "a" : "A")
    .replace(/[âÂ]/g, (c) => c === "a" ? "a" : "A")
    .replace(/[îÎ]/g, (c) => c === "i" ? "i" : "I")
    .replace(/[șşŞŠ]/g, (c) => c.toLowerCase() === "s" ? "s" : "S")
    .replace(/[țţŢŤ]/g, (c) => c.toLowerCase() === "t" ? "t" : "T");
}

function getExportCols(t: (k: string) => string) {
  return [
    { key: "name", label: t("employees.fields.name") },
    { key: "position", label: t("employees.fields.position") },
    { key: "department", label: t("employees.fields.department") },
    { key: "phone", label: t("employees.fields.phone") },
    { key: "email", label: t("employees.fields.email") },
    { key: "hireDate", label: t("employees.fields.hireDate") },
    { key: "salary", label: t("employees.fields.salaryExport") },
  ];
}

function toRows(employees: Employee[], cols: { key: string; label: string }[]) {
  return employees.map((e) => {
    const mapped = {
      id: e.id,
      name: e.name,
      position: e.position,
      department: e.department,
      phone: e.phone,
      email: e.email,
      hireDate: e.hireDate,
      salary: e.salary,
    };

    return Object.fromEntries(
      cols.map((c) => [c.label, mapped[c.key as keyof typeof mapped] ?? ""])
    );
  });
}

function exportPDF(employees: Employee[], t: (k: string) => string) {
  const cols = getExportCols(t);
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(toPdfSafeText(t("employees.export.pdfTitle")), 14, 16);
  autoTable(doc, {
    head: [cols.map((c) => toPdfSafeText(c.label))],
    body: employees.map((emp) =>
      cols.map((c) => toPdfSafeText((emp as unknown as Record<string, unknown>)[c.key]))
    ),
    startY: 22,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 30, 30] },
  });
  doc.save(`${t("employees.export.filename")}.pdf`);
}

function exportExcel(employees: Employee[], t: (k: string) => string) {
  const cols = getExportCols(t);
  const ws = XLSX.utils.json_to_sheet(toRows(employees, cols));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, t("employees.listTitle"));
  XLSX.writeFile(wb, `${t("employees.export.filename")}.xlsx`);
}

function exportCSV(employees: Employee[], t: (k: string) => string) {
  const cols = getExportCols(t);
  const csv = Papa.unparse(toRows(employees, cols));
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${t("employees.export.filename")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

type Props = {
  employees: Employee[];
  iconOnly?: boolean;
};

export function EmployeeExportMenu({ employees, iconOnly = false }: Props) {
  const { t } = useTranslation();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={iconOnly ? "icon" : "sm"} title={t("employees.actions.export")}>
          <Download className="h-3.5 w-3.5" />
          {!iconOnly && <span className="ml-1.5">{t("employees.actions.export")}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem className="cursor-pointer" onClick={() => exportPDF(employees, t)}>
          {t("employees.actions.exportPdf")}
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" onClick={() => exportExcel(employees, t)}>
          {t("employees.actions.exportExcel")}
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" onClick={() => exportCSV(employees, t)}>
          {t("employees.actions.exportCsv")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}