// ──────────────────────────────────────────────────────────
// Hook reutilizabil pentru export PDF, Excel, CSV
// src/modules/reports/hooks/useExport.ts
// ──────────────────────────────────────────────────────────

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import Papa from "papaparse";

export interface ExportColumn {
  header: string;
  key: string;
}

export interface ExportOptions {
  filename: string;
  title: string;
  columns: ExportColumn[];
  rows: Record<string, unknown>[];
  companyName?: string;
}

// ← ADĂUGAT: înlocuiește diacriticele românești cu echivalente compatibile PDF
function normalizeDiacritics(text: string): string {
  return text
    .replace(/ă/g, "a")
    .replace(/Ă/g, "A")
    .replace(/â/g, "a")
    .replace(/Â/g, "A")
    .replace(/î/g, "i")
    .replace(/Î/g, "I")
    .replace(/ș/g, "s")
    .replace(/Ș/g, "S")
    .replace(/ț/g, "t")
    .replace(/Ț/g, "T")
    .replace(/ş/g, "s")
    .replace(/Ş/g, "S") // varianta veche
    .replace(/ţ/g, "t")
    .replace(/Ţ/g, "T"); // varianta veche
}

export function useExport() {
  // ── PDF ──
  function exportPDF({ filename, title, columns, rows, companyName = "Transmarin Logistic SRL" }: ExportOptions) {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(companyName, 14, 15);

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(normalizeDiacritics(title), 14, 23); // ← MODIFICAT

    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Generat: ${new Date().toLocaleDateString("ro-RO")}`, 14, 29);
    doc.setTextColor(0);

    autoTable(doc, {
      startY: 34,
      head: [columns.map((c) => normalizeDiacritics(c.header))], // ← MODIFICAT
      body: rows.map(
        (row) => columns.map((c) => normalizeDiacritics(String(row[c.key] ?? ""))), // ← MODIFICAT
      ),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 64, 175] },
    });

    doc.save(`${filename}.pdf`);
  }

  // ── Excel ──
  function exportExcel({ filename, title, columns, rows, companyName = "Transmarin Logistic SRL" }: ExportOptions) {
    const wsData = [
      [companyName],
      [title],
      [`Generat: ${new Date().toLocaleDateString("ro-RO")}`],
      [],
      columns.map((c) => c.header), // Excel suportă diacritice nativ ← fără modificare
      ...rows.map((row) => columns.map((c) => row[c.key] ?? "")),
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Raport");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  }

  // ── CSV ──
  function exportCSV({ filename, columns, rows }: ExportOptions) {
    const data = rows.map((row) => columns.reduce((acc, c) => ({ ...acc, [c.header]: row[c.key] ?? "" }), {} as Record<string, unknown>));

    const csv = Papa.unparse(data);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }); // ← MODIFICAT: adăugat BOM pentru diacritice în Excel/Notepad
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return { exportPDF, exportExcel, exportCSV };
}
