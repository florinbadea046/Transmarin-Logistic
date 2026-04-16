import type { Part } from "@/modules/fleet/types";
import { exportToExcel } from "@/utils/exports";

export function exportPartsToExcel(
  parts: Part[],
  t: (k: string) => string,
): Promise<void> {
  return exportToExcel({
    filename: `inventar-piese-${new Date().toISOString().split("T")[0]}`,
    sheetName: t("fleet.parts.exportSheetName"),
    columns: [
      { header: t("fleet.parts.exportColumnName"), accessor: (p) => p.name },
      { header: t("fleet.parts.exportColumnCategory"), accessor: (p) => p.category },
      { header: t("fleet.parts.exportColumnSupplier"), accessor: (p) => p.supplier },
      { header: t("fleet.parts.exportColumnUnitPrice"), accessor: (p) => p.unitPrice },
      { header: t("fleet.parts.exportColumnQuantity"), accessor: (p) => p.quantity },
      { header: t("fleet.parts.exportColumnMinStock"), accessor: (p) => p.minStock },
      {
        header: t("fleet.parts.exportColumnStockStatus"),
        accessor: (p) =>
          p.quantity < p.minStock
            ? t("fleet.parts.exportStockLow")
            : t("fleet.parts.exportStockOk"),
      },
    ],
    rows: parts,
  });
}
