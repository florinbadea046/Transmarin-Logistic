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
import { exportToPdf, exportToExcel, exportToCsv } from "@/utils/exports";

function buildColumns(t: (k: string) => string) {
  return [
    { header: t("employees.fields.name"), accessor: (e: Employee) => e.name },
    { header: t("employees.fields.position"), accessor: (e: Employee) => e.position },
    { header: t("employees.fields.department"), accessor: (e: Employee) => e.department },
    { header: t("employees.fields.phone"), accessor: (e: Employee) => e.phone },
    { header: t("employees.fields.email"), accessor: (e: Employee) => e.email },
    { header: t("employees.fields.hireDate"), accessor: (e: Employee) => e.hireDate },
    { header: t("employees.fields.salaryExport"), accessor: (e: Employee) => e.salary },
  ];
}

function exportPDF(employees: Employee[], t: (k: string) => string) {
  exportToPdf({
    filename: t("employees.export.filename"),
    title: t("employees.export.pdfTitle"),
    columns: buildColumns(t),
    rows: employees,
  });
}

function exportExcel(employees: Employee[], t: (k: string) => string) {
  exportToExcel({
    filename: t("employees.export.filename"),
    sheetName: t("employees.listTitle"),
    columns: buildColumns(t),
    rows: employees,
  });
}

function exportCSV(employees: Employee[], t: (k: string) => string) {
  exportToCsv({
    filename: t("employees.export.filename"),
    columns: buildColumns(t),
    rows: employees,
  });
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
