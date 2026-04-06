import * as XLSX from "xlsx";
import { Part } from "@/modules/fleet/types";

export function exportPartsToExcel(
  parts: Part[],
  t: (k: string) => string,
): void {
  const data = parts.map((p) => ({
    [t("fleet.parts.exportColumnName")]: p.name,
    [t("fleet.parts.exportColumnCategory")]: p.category,
    [t("fleet.parts.exportColumnSupplier")]: p.supplier,
    [t("fleet.parts.exportColumnUnitPrice")]: p.unitPrice,
    [t("fleet.parts.exportColumnQuantity")]: p.quantity,
    [t("fleet.parts.exportColumnMinStock")]: p.minStock,
    [t("fleet.parts.exportColumnStockStatus")]:
      p.quantity < p.minStock
        ? t("fleet.parts.exportStockLow")
        : t("fleet.parts.exportStockOk"),
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, t("fleet.parts.exportSheetName"));

  const colWidths = Object.keys(data[0] || {}).map((key) => ({
    wch: Math.max(
      key.length,
      ...data.map((row) => String(row[key as keyof typeof row] ?? "").length)
    ) + 2,
  }));
  ws["!cols"] = colWidths;
  XLSX.writeFile(wb, `inventar-piese-${new Date().toISOString().split("T")[0]}.xlsx`);
}
