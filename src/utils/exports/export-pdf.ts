// `jspdf` + `jspdf-autotable` adauga ~415 KB la bundle. Le incarcam lazy la
// momentul exportului pentru a pastra main bundle-ul subtire.
import type { default as JsPDFType } from "jspdf";
import { stripDiacritics } from "./strip-diacritics";

export interface PdfColumn<T> {
  header: string;
  accessor: (row: T) => string | number;
}

export interface PdfFooterCell {
  content: string;
  colSpan?: number;
  align?: "left" | "center" | "right";
  bold?: boolean;
}

export interface ExportPdfOptions<T> {
  filename: string;
  title: string;
  subtitle?: string;
  columns: PdfColumn<T>[];
  rows: T[];
  company?: string;
  orientation?: "portrait" | "landscape";
  stripRomanian?: boolean;
  footerRow?: PdfFooterCell[];
  extraLines?: string[];
  showHeader?: boolean;
}

export async function exportToPdf<T>(options: ExportPdfOptions<T>): Promise<void> {
  const {
    filename,
    title,
    subtitle,
    columns,
    rows,
    company = "Transmarin Logistic SRL",
    orientation = "portrait",
    stripRomanian = true,
    footerRow,
    extraLines,
    showHeader = true,
  } = options;

  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const strip = stripRomanian ? stripDiacritics : (s: string) => s;
  const doc: JsPDFType = new jsPDF({ orientation });

  let y = 15;

  if (showHeader) {
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(company, 14, y);
    y += 8;

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(strip(title), 14, y);
    y += 6;

    if (subtitle) {
      doc.setFontSize(10);
      doc.setTextColor(120);
      doc.text(strip(subtitle), 14, y);
      doc.setTextColor(0);
      y += 5;
    }

    if (extraLines && extraLines.length > 0) {
      doc.setFontSize(9);
      doc.setTextColor(80);
      for (const line of extraLines) {
        doc.text(strip(line), 14, y);
        y += 4;
      }
      doc.setTextColor(0);
    }

    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(
      `${strip("Generat")}: ${new Date().toLocaleDateString("ro-RO")}`,
      14,
      y,
    );
    doc.setTextColor(0);
    y += 4;
  } else {
    doc.setFontSize(14);
    doc.text(strip(title), 14, 16);
    if (subtitle) {
      doc.setFontSize(11);
      doc.text(strip(subtitle), 14, 24);
      y = 30;
    } else {
      y = 22;
    }
  }

  autoTable(doc, {
    startY: y,
    head: [columns.map((c) => strip(c.header))],
    body: rows.map((row) =>
      columns.map((c) => {
        const v = c.accessor(row);
        return typeof v === "string" ? strip(v) : String(v);
      }),
    ),
    foot: footerRow
      ? [
          footerRow.map((cell) => ({
            content: strip(cell.content),
            colSpan: cell.colSpan,
            styles: {
              halign: cell.align ?? "left",
              fontStyle: cell.bold ? ("bold" as const) : ("normal" as const),
            },
          })),
        ]
      : undefined,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 64, 175] },
    footStyles: footerRow
      ? { fillColor: [240, 240, 240], textColor: [0, 0, 0] }
      : undefined,
    showFoot: footerRow ? "lastPage" : undefined,
  });

  const safeName = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  doc.save(strip(safeName));
}
