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
    "Status stoc": p.quantity <= p.minStock ? "Stoc scăzut" : "OK",
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inventar Piese");

  // Lățime coloane
  ws["!cols"] = [
    { wch: 25 }, { wch: 15 }, { wch: 20 },
    { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 14 },
  ];

  XLSX.writeFile(wb, `inventar-piese-${new Date().toISOString().split("T")[0]}.xlsx`);
}