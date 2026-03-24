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

function toPdfSafeText(value: unknown) {
  return String(value ?? "")
    .replace(/ă/g, "a")
    .replace(/Ă/g, "A")
    .replace(/â/g, "a")
    .replace(/Â/g, "A")
    .replace(/î/g, "i")
    .replace(/Î/g, "I")
    .replace(/ş/g, "s")
    .replace(/Ş/g, "S")
    .replace(/ș/g, "s")
    .replace(/Ș/g, "S")
    .replace(/ţ/g, "t")
    .replace(/Ţ/g, "T")
    .replace(/ț/g, "t")
    .replace(/Ț/g, "T");
}

function getExportEmployeeCols() {
  return [
    { key: "name", label: "Nume" },
    { key: "position", label: "Funcție" },
    { key: "department", label: "Departament" },
    { key: "phone", label: "Telefon" },
    { key: "email", label: "Email" },
    { key: "hireDate", label: "Data angajării" },
    { key: "salary", label: "Salariu (RON)" },
  ];
}

function toRows<T>(items: T[], cols: { key: string; label: string }[]) {
  return items.map((item) =>
    Object.fromEntries(cols.map((c) => [c.label, (item as any)[c.key] ?? ""])),
  );
}

function exportEmployeesPDF(employees: Employee[]) {
  const cols = getExportEmployeeCols();
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text("Lista angajati", 14, 16);
  autoTable(doc, {
    head: [cols.map((c) => toPdfSafeText(c.label))],
    body: employees.map((employee) =>
      cols.map((c) => toPdfSafeText((employee as any)[c.key])),
    ),
    startY: 22,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 30, 30] },
  });
  doc.save("angajati.pdf");
}

function exportEmployeesExcel(employees: Employee[]) {
  const cols = getExportEmployeeCols();
  const ws = XLSX.utils.json_to_sheet(toRows(employees, cols));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Angajați");
  XLSX.writeFile(wb, "angajati.xlsx");
}

function exportEmployeesCSV(employees: Employee[]) {
  const cols = getExportEmployeeCols();
  const csv = Papa.unparse(toRows(employees, cols));
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "angajati.csv";
  a.click();
  URL.revokeObjectURL(url);
}

type EmployeeExportMenuProps = {
  employees: Employee[];
};

export function EmployeeExportMenu({ employees }: EmployeeExportMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => exportEmployeesPDF(employees)}
        >
          Export PDF
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => exportEmployeesExcel(employees)}
        >
          Export Excel
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => exportEmployeesCSV(employees)}
        >
          Export CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
