import * as XLSX from "xlsx";
import { Part } from "@/modules/fleet/types";

export function exportPartsToExcel(parts: Part[]): void {
  const data = parts.map((p) => ({
    Nume: p.name,
    Categorie: p.category,
    Furnizor: p.supplier,
    "Preț unitar (RON)": p.unitPrice,
    Cantitate: p.quantity,
    "Stoc minim": p.minStock,
    "Status stoc": p.quantity < p.minStock ? "Stoc scăzut" : "OK",
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inventar Piese");

  const colWidths = Object.keys(data[0] || {}).map((key) => ({
    wch: Math.max(
      key.length,
      ...data.map((row) => String(row[key as keyof typeof row] ?? "").length)
    ) + 2,
  }));
  ws["!cols"] = colWidths;
  XLSX.writeFile(wb, `inventar-piese-${new Date().toISOString().split("T")[0]}.xlsx`);
}