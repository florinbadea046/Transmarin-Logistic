import { format } from "date-fns";
import type { TFunction } from "i18next";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

import type { Invoice } from "@/modules/accounting/types";

// ── Culori ─────────────────────────────────────────────────
export const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

// ── Helpers ────────────────────────────────────────────────
export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON" }).format(value);

export function stripDiacritics(str: string): string {
  return str
    .replace(/[ăĂ]/g, (c) => c === "ă" ? "a" : "A")
    .replace(/[âÂ]/g, (c) => c === "â" ? "a" : "A")
    .replace(/[îÎ]/g, (c) => c === "î" ? "i" : "I")
    .replace(/[șşŞŠ]/g, (c) => c === c.toLowerCase() ? "s" : "S")
    .replace(/[țţŢŤ]/g, (c) => c === c.toLowerCase() ? "t" : "T");
}

// ── Builders ───────────────────────────────────────────────
export function buildBarData(invoices: Invoice[]) {
  const map: Record<string, { luna: string; venituri: number; cheltuieli: number }> = {};
  for (const inv of invoices) {
    const luna = inv.date.slice(0, 7);
    if (!map[luna]) map[luna] = { luna, venituri: 0, cheltuieli: 0 };
    if (inv.type === "income") map[luna].venituri += inv.total;
    else map[luna].cheltuieli += inv.total;
  }
  return Object.values(map).sort((a, b) => a.luna.localeCompare(b.luna));
}

export function buildPieData(invoices: Invoice[], t: TFunction) {
  const expenses = invoices.filter((i) => i.type === "expense");
  const map: Record<string, number> = {};
  for (const inv of expenses) {
    for (const item of inv.items) {
      const desc = item.description.toLowerCase();
      let category = t("financialReports.pie.other");
      if (desc.includes("combustibil") || desc.includes("fuel"))
        category = t("financialReports.pie.fuel");
      else if (desc.includes("service") || desc.includes("piese") || desc.includes("filtru") || desc.includes("placute"))
        category = t("financialReports.pie.maintenance");
      else if (desc.includes("salariu") || desc.includes("angajat"))
        category = t("financialReports.pie.salaries");
      else if (inv.clientName)
        category = inv.clientName.replace(/\bSRL\b|\bSA\b/g, "").trim();
      map[category] = (map[category] ?? 0) + item.total;
    }
  }
  return Object.entries(map)
    .map(([name, value]) => ({ name, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
}

// ── Status badge colors ────────────────────────────────────
export const statusColors: Record<string, string> = {
  paid: "bg-green-500/20 text-green-400 border-green-500/30",
  sent: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  overdue: "bg-red-500/20 text-red-400 border-red-500/30",
  draft: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

// ── Export PDF ─────────────────────────────────────────────
export function exportPDF(
  invoices: Invoice[],
  totalVenituri: number,
  totalCheltuieli: number,
  balanta: number,
  startDate: Date | undefined,
  endDate: Date | undefined,
  t: TFunction,
) {
  const doc = new jsPDF();
  const margin = 14;
  const rangeLabel = startDate
    ? `${format(startDate, "dd.MM.yyyy")}${endDate ? ` - ${format(endDate, "dd.MM.yyyy")}` : ""}`
    : t("financialReports.pdf.allData");

  doc.setFontSize(16);
  doc.text(t("financialReports.pdf.title"), margin, 16);
  doc.setFontSize(10);
  doc.text(`${t("financialReports.pdf.interval")}: ${stripDiacritics(rangeLabel)}`, margin, 24);
  doc.text(`${t("financialReports.pdf.generated")}: ${format(new Date(), "dd.MM.yyyy HH:mm")}`, margin, 30);

  let y = 40;
  doc.setFontSize(11);
  doc.text(`${t("financialReports.totalIncome")}: ${formatCurrency(totalVenituri)}`, margin, y); y += 6;
  doc.text(`${t("financialReports.totalExpenses")}: ${formatCurrency(totalCheltuieli)}`, margin, y); y += 6;
  doc.text(`${t("financialReports.balance")}: ${formatCurrency(balanta)}`, margin, y); y += 10;

  autoTable(doc, {
    startY: y,
    head: [[
      t("financialReports.invoiceNr"),
      t("financialReports.type"),
      t("financialReports.client"),
      t("financialReports.date"),
      t("financialReports.total"),
      t("financialReports.status"),
    ]],
    body: invoices.map((inv) => [
      inv.number,
      inv.type === "income" ? t("financialReports.typeIncome") : t("financialReports.typeExpense"),
      stripDiacritics(inv.clientName),
      inv.date,
      formatCurrency(inv.total),
      t(`financialReports.status_${inv.status}`),
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 30, 30] },
    margin: { left: margin, right: margin },
    didParseCell: (data) => {
      if (typeof data.cell.text[0] === "string")
        data.cell.text[0] = stripDiacritics(data.cell.text[0]);
    },
  });

  doc.save(`${t("financialReports.pdf.filename")}.pdf`);
}

// ── Export Excel ───────────────────────────────────────────
export function exportExcel(invoices: Invoice[], t: TFunction) {
  const rows = invoices.map((inv) => ({
    [t("financialReports.invoiceNr")]: inv.number,
    [t("financialReports.type")]: inv.type === "income" ? t("financialReports.typeIncome") : t("financialReports.typeExpense"),
    [t("financialReports.client")]: inv.clientName,
    [t("financialReports.date")]: inv.date,
    [t("financialReports.total")]: inv.total,
    [t("financialReports.status")]: t(`financialReports.status_${inv.status}`),
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, t("financialReports.title"));
  XLSX.writeFile(wb, `${t("financialReports.pdf.filename")}.xlsx`);
}
