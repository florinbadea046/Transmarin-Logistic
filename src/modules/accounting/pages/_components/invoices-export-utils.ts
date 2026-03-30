import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import Papa from "papaparse";

import type { Invoice } from "./invoices-types";
import { calcLineTotals } from "./invoices-utils";

// ── Export helpers ────────────────────────────────────────────────────────────

type ExportRow = {
  [key: string]: string
}

export function getExportRows(invoices: Invoice[], t: (key: string) => string): ExportRow[] {
  return invoices.map((inv) => {
    const { totalFaraTVA, tva, total } = calcLineTotals(inv.linii)

    return {
      [t("invoices.columns.nr")]: inv.nr,
      [t("invoices.columns.clientSupplier")]: inv.clientFurnizor,
      [t("invoices.columns.type")]: inv.tip === "venit" ? t("invoices.typeLabels.income") : t("invoices.typeLabels.expense"),
      [t("invoices.columns.date")]: inv.data,
      [t("invoices.columns.subtotal")]: totalFaraTVA.toFixed(2),
      [t("invoices.columns.vat")]: tva.toFixed(2),
      [t("invoices.columns.total")]: total.toFixed(2),
      [t("invoices.columns.status")]: t(`invoices.statusLabels.${inv.status}`),
    }
  })
}

export function exportPDF(invoices: Invoice[], t: (key: string) => string) {
  const doc = new jsPDF()

  doc.setFontSize(16)
  doc.text(t("invoices.header"), 14, 16)

  doc.setFontSize(11)
  doc.text(`${t("invoices.export.invoiceList")} [${new Date().toLocaleDateString("ro-RO")}]`, 14, 24)

  const rows = getExportRows(invoices, t)

  const cols = Object.keys(rows[0] ?? {})

  autoTable(doc, {
    head: [cols],
    body: rows.map((r) => cols.map((c) => r[c])),
    startY: 30,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 30, 30] },
  })

  doc.save("facturi.pdf")
}

export function exportExcel(invoices: Invoice[], t: (key: string) => string) {
  const rows = getExportRows(invoices, t)

  const ws = XLSX.utils.json_to_sheet(rows)

  const wb = XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(wb, ws, t("invoices.title"))

  XLSX.writeFile(wb, "facturi.xlsx")
}

export function exportCSV(invoices: Invoice[], t: (key: string) => string) {
  const rows = getExportRows(invoices, t)

  const csv = Papa.unparse(rows)

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })

  const url = URL.createObjectURL(blob)

  const a = document.createElement("a")

  a.href = url
  a.download = "facturi.csv"

  a.click()

  URL.revokeObjectURL(url)
}
