import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Employee } from "@/modules/hr/types";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { getEmployeeDepartmentLabel } from "../utils/department-label";

type ExportEmployeeKey =
  | "name"
  | "position"
  | "department"
  | "phone"
  | "email"
  | "hireDate"
  | "salary";

type ExportEmployeeColumn = {
  key: ExportEmployeeKey;
  label: string;
};

function toPdfSafeText(value: unknown) {
  return String(value ?? "")
    .replace(/ă/g, "a")
    .replace(/Ă/g, "A")
    .replace(/â/g, "a")
    .replace(/Â/g, "A")
    .replace(/î/g, "i")
    .replace(/Î/g, "I")
    .replace(/ș/g, "s")
    .replace(/Ș/g, "S")
    .replace(/ț/g, "t")
    .replace(/Ț/g, "T");
}

function getExportEmployeeCols(t: (key: string) => string): ExportEmployeeColumn[] {
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

function getEmployeeExportValue(
  employee: Employee,
  key: ExportEmployeeKey,
  t: (key: string) => string,
) {
  if (key === "department") {
    return getEmployeeDepartmentLabel(t, employee.department);
  }

  return employee[key];
}

function toRows(
  items: Employee[],
  cols: ExportEmployeeColumn[],
  t: (key: string) => string,
) {
  return items.map((employee) =>
    Object.fromEntries(
      cols.map((c) => [
        c.label,
        getEmployeeExportValue(employee, c.key, t),
      ]),
    ),
  );
}

function exportEmployeesPDF(employees: Employee[], t: (key: string) => string) {
  const cols = getExportEmployeeCols(t);
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(toPdfSafeText(t("employees.export.pdfTitle")), 14, 16);
  autoTable(doc, {
    head: [cols.map((c) => toPdfSafeText(c.label))],
    body: employees.map((employee) =>
      cols.map((c) => toPdfSafeText(getEmployeeExportValue(employee, c.key, t))),
    ),
    startY: 22,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 30, 30] },
  });
  doc.save(`${t("employees.export.filename")}.pdf`);
}

function exportEmployeesExcel(
  employees: Employee[],
  t: (key: string) => string,
) {
  const cols = getExportEmployeeCols(t);
  const ws = XLSX.utils.json_to_sheet(toRows(employees, cols, t));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, t("employees.title"));
  XLSX.writeFile(wb, `${t("employees.export.filename")}.xlsx`);
}

function exportEmployeesCSV(employees: Employee[], t: (key: string) => string) {
  const cols = getExportEmployeeCols(t);
  const csv = Papa.unparse(toRows(employees, cols, t));
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${t("employees.export.filename")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

type EmployeeExportMenuProps = {
  employees: Employee[];
};

export function EmployeeExportMenu({ employees }: EmployeeExportMenuProps) {
  const { t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          {t("employees.actions.export")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => exportEmployeesPDF(employees, t)}
        >
          {t("employees.actions.exportPdf")}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => exportEmployeesExcel(employees, t)}
        >
          {t("employees.actions.exportExcel")}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => exportEmployeesCSV(employees, t)}
        >
          {t("employees.actions.exportCsv")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}