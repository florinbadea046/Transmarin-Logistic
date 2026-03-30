import { useTranslation } from "react-i18next";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Download } from "lucide-react";

import type { Invoice } from "./invoices-types";
import { exportPDF, exportExcel, exportCSV } from "./invoices-export-utils";

// ── Export Menu ───────────────────────────────────────────────────────────────
export function ExportMenu({
  invoices,
  selectedIds,
  filteredInvoices,
}: {
  invoices: Invoice[];
  selectedIds: Set<string>;
  filteredInvoices: Invoice[];
}) {
  const { t } = useTranslation();

  // Dacă există selecție → exportă doar selecția; altfel → toate cele filtrate
  const toExport = selectedIds.size > 0
    ? invoices.filter((inv) => selectedIds.has(inv.id))
    : filteredInvoices;

  const label = selectedIds.size > 0
    ? `${t("invoices.export.export")} (${selectedIds.size})`
    : t("invoices.export.export");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={selectedIds.size > 0 ? "border-blue-500 text-blue-400" : ""}>
          <Download className="w-4 h-4 mr-1" />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {selectedIds.size > 0 && (
          <>
            <div className="px-2 py-1 text-xs text-muted-foreground font-medium">
              {t("invoices.selection.count", { count: selectedIds.size })}
            </div>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => { exportPDF(toExport, t); toast.success(t("invoices.export.pdfSuccess")); }}
        >
          {t("invoices.export.pdf")}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => { exportExcel(toExport, t); toast.success(t("invoices.export.excelSuccess")); }}
        >
          {t("invoices.export.excel")}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => { exportCSV(toExport, t); toast.success(t("invoices.export.csvSuccess")); }}
        >
          {t("invoices.export.csv")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
