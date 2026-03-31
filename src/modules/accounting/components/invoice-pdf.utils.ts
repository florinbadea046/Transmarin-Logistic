// accounting/components/invoice-pdf.utils.ts
// Tipuri, constante și funcția generateInvoicePDF (fără componente React)

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Tipuri ────────────────────────────────────────────────────────────────────

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate?: number; // procent, ex: 19
}

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  supplierName?: string;
  supplierAddress?: string;
  supplierCUI?: string;
  supplierIBAN?: string;
  supplierBank?: string;
  clientName: string;
  clientAddress?: string;
  clientCUI?: string;
  lineItems: InvoiceLineItem[];
  paymentTerms?: string;
  notes?: string;
}

// ─── Constante firmă ───────────────────────────────────────────────────────────

export const COMPANY = {
  name: "Transmarin Logistic SRL",
  address: "Str. Portului nr. 12, Constanța, 900001, România",
  cui: "RO12345678",
  regCom: "J13/1234/2010",
  iban: "RO49 AAAA 1B31 0075 9384 0000",
  bank: "Banca Transilvania",
  phone: "+40 241 000 000",
  email: "office@transmarin-logistic.ro",
};

export const STATUS_LABELS: Record<InvoiceData["status"], string> = {
  draft: "Ciornă",
  sent: "Trimisă",
  paid: "Achitată",
  overdue: "Restantă",
  cancelled: "Anulată",
};

// ─── Utilitar formatare ────────────────────────────────────────────────────────

export const fmt = (n: number) =>
  n.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtDate = (iso?: string) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
};

// ─── Normalizare diacritice române (jsPDF/Helvetica nu suportă UTF-8 nativ) ───
// Înlocuiește ș/ț/ă/î/â cu s/t/a/i/a pentru a evita caractere tăiate/lipsă.
export const ro = (s: string): string =>
  s
    .replace(/ș|ş/g, "s").replace(/Ș|Ş/g, "S")
    .replace(/ț|ţ/g, "t").replace(/Ț|Ţ/g, "T")
    .replace(/ă/g, "a").replace(/Ă/g, "A")
    .replace(/î/g, "i").replace(/Î/g, "I")
    .replace(/â/g, "a").replace(/Â/g, "A")
    .replace(/—/g, "-");

// ─── Generator PDF ─────────────────────────────────────────────────────────────

export function generateInvoicePDF(invoice: InvoiceData): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const supplier = {
    name:    ro(invoice.supplierName ?? COMPANY.name),
    address: ro(invoice.supplierAddress ?? COMPANY.address),
    cui:     invoice.supplierCUI ?? COMPANY.cui,
    iban:    invoice.supplierIBAN ?? COMPANY.iban,
    bank:    ro(invoice.supplierBank ?? COMPANY.bank),
  };

  type RGB = [number, number, number];
  const NAVY: RGB = [15, 40, 80];
  const ACCENT: RGB = [0, 112, 192];
  const LIGHT_BG: RGB = [240, 245, 252];
  const GRAY: RGB = [100, 100, 100];
  const BLACK: RGB = [30, 30, 30];
  const WHITE: RGB = [255, 255, 255];

  const pageW = 210;
  const pageH = 297;
  const margin = 14;
  const contentW = pageW - margin * 2;

  // ── Header banner ─────────────────────────────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 36, "F");

  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("TRANSMARIN", margin, 15);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("LOGISTIC SRL", margin, 21);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("FACTURA", pageW - margin, 16, { align: "right" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Nr. ${invoice.invoiceNumber}`, pageW - margin, 23, { align: "right" });

  const statusLabel = ro(STATUS_LABELS[invoice.status] ?? invoice.status.toUpperCase());
  const badgeColors: Record<string, RGB> = {
    paid:      [0, 160, 80],
    sent:      [0, 112, 192],
    overdue:   [200, 40, 40],
    draft:     [120, 120, 120],
    cancelled: [80, 80, 80],
  };
  const badgeColor: RGB = badgeColors[invoice.status] ?? GRAY;
  doc.setFillColor(...badgeColor);
  const badgeW = Math.max(28, doc.getTextWidth(statusLabel) + 8);
  const badgeX = pageW - margin - badgeW;
  doc.roundedRect(badgeX, 26, badgeW, 7, 2, 2, "F");
  doc.setTextColor(...WHITE);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(statusLabel, badgeX + badgeW / 2, 31.2, { align: "center" });

  // ── Info dată ─────────────────────────────────────────────────────────────────
  doc.setFillColor(...LIGHT_BG);
  doc.rect(0, 36, pageW, 12, "F");
  doc.setTextColor(...GRAY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(`Data emiterii: ${fmtDate(invoice.invoiceDate)}`, margin, 43.5);
  if (invoice.dueDate) {
    doc.text(`Scadenta: ${fmtDate(invoice.dueDate)}`, margin + 55, 43.5);
  }

  // ── Furnizor & client ─────────────────────────────────────────────────────────
  let y = 54;
  const col1X = margin;
  const col2X = pageW / 2 + 2;
  const blockW = contentW / 2 - 4;

  doc.setFillColor(...ACCENT);
  doc.rect(col1X, y, blockW, 7, "F");
  doc.rect(col2X, y, blockW, 7, "F");
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("FURNIZOR", col1X + 3, y + 4.8);
  doc.text("CLIENT", col2X + 3, y + 4.8);
  y += 7;

  doc.setFillColor(248, 250, 254);
  doc.rect(col1X, y, blockW, 32, "F");
  doc.rect(col2X, y, blockW, 32, "F");

  doc.setTextColor(...BLACK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(supplier.name, col1X + 3, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  const supplierLines = doc.splitTextToSize(supplier.address, blockW - 6);
  doc.text(supplierLines, col1X + 3, y + 13);
  doc.text(`CUI: ${supplier.cui}`, col1X + 3, y + 13 + supplierLines.length * 4.5);
  doc.text(`Reg. Com.: ${COMPANY.regCom}`, col1X + 3, y + 13 + supplierLines.length * 4.5 + 4.5);

  doc.setTextColor(...BLACK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(ro(invoice.clientName), col2X + 3, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  if (invoice.clientAddress) {
    const clientLines = doc.splitTextToSize(ro(invoice.clientAddress), blockW - 6);
    doc.text(clientLines, col2X + 3, y + 13);
  }
  if (invoice.clientCUI) {
    doc.text(`CUI: ${invoice.clientCUI}`, col2X + 3, y + 25);
  }

  y += 36;

  // ── Tabel line items ──────────────────────────────────────────────────────────
  const tableData = invoice.lineItems.map((item, idx) => {
    const vat = item.vatRate ?? 19;
    const subtotal = item.quantity * item.unitPrice;
    const vatAmt = subtotal * (vat / 100);
    const total = subtotal + vatAmt;
    return [
      String(idx + 1),
      ro(item.description),
      String(item.quantity),
      `${fmt(item.unitPrice)} RON`,
      `${vat}%`,
      `${fmt(vatAmt)} RON`,
      `${fmt(total)} RON`,
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [["#", "Descriere", "Cant.", "Pret unitar", "TVA %", "TVA", "Total"]],
    body: tableData,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 8.5,
      cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
      textColor: BLACK,
      lineColor: [210, 220, 235],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: NAVY,
      textColor: WHITE,
      fontStyle: "bold",
      fontSize: 8.5,
    },
    alternateRowStyles: { fillColor: [247, 250, 255] },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: "auto" },
      2: { cellWidth: 14, halign: "center" },
      3: { cellWidth: 26, halign: "right" },
      4: { cellWidth: 14, halign: "center" },
      5: { cellWidth: 24, halign: "right" },
      6: { cellWidth: 28, halign: "right", fontStyle: "bold" },
    },
  });

  // ── Totale ────────────────────────────────────────────────────────────────────
  const finalY: number = (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y + 20;
  let ty = finalY + 6;

  const subtotalNet = invoice.lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const totalVAT = invoice.lineItems.reduce((sum, item) => {
    const vat = item.vatRate ?? 19;
    return sum + item.quantity * item.unitPrice * (vat / 100);
  }, 0);
  const grandTotal = subtotalNet + totalVAT;

  const totalsX = pageW - margin - 70;
  const totalsW = 70;

  doc.setFillColor(245, 248, 255);
  doc.rect(totalsX, ty, totalsW, 8, "F");
  doc.setTextColor(...GRAY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Subtotal (fara TVA):", totalsX + 3, ty + 5.3);
  doc.setTextColor(...BLACK);
  doc.text(`${fmt(subtotalNet)} RON`, totalsX + totalsW - 3, ty + 5.3, { align: "right" });
  ty += 8;

  doc.setFillColor(245, 248, 255);
  doc.rect(totalsX, ty, totalsW, 8, "F");
  doc.setTextColor(...GRAY);
  doc.text("TVA 19%:", totalsX + 3, ty + 5.3);
  doc.setTextColor(...BLACK);
  doc.text(`${fmt(totalVAT)} RON`, totalsX + totalsW - 3, ty + 5.3, { align: "right" });
  ty += 8;

  doc.setFillColor(...NAVY);
  doc.rect(totalsX, ty, totalsW, 10, "F");
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("TOTAL:", totalsX + 3, ty + 6.5);
  doc.text(`${fmt(grandTotal)} RON`, totalsX + totalsW - 3, ty + 6.5, { align: "right" });
  ty += 14;

  // ── Condiții plată & note ─────────────────────────────────────────────────────
  if (invoice.paymentTerms || invoice.notes) {
    doc.setFillColor(...LIGHT_BG);
    doc.rect(margin, ty, contentW, 18, "F");
    doc.setTextColor(...ACCENT);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("CONDITII DE PLATA", margin + 3, ty + 5);
    doc.setTextColor(...GRAY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    if (invoice.paymentTerms) {
      doc.text(ro(invoice.paymentTerms), margin + 3, ty + 10);
    }
    if (invoice.notes) {
      doc.text(ro(invoice.notes), margin + 3, ty + 15);
    }
  }

  // ── Footer ────────────────────────────────────────────────────────────────────
  const footerY = pageH - 22;

  doc.setFillColor(...NAVY);
  doc.rect(0, footerY, pageW, 22, "F");

  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Date bancare:", margin, footerY + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(180, 200, 230);
  doc.text(`IBAN: ${supplier.iban}`, margin, footerY + 12);
  doc.text(`Banca: ${supplier.bank}`, margin, footerY + 17);

  doc.setTextColor(180, 200, 230);
  doc.text(COMPANY.phone, pageW - margin, footerY + 9, { align: "right" });
  doc.text(COMPANY.email, pageW - margin, footerY + 14, { align: "right" });

  doc.setTextColor(120, 150, 190);
  doc.setFontSize(7);
  doc.text(
    `Document generat automat · Transmarin Logistic SRL · Pagina 1`,
    pageW / 2,
    footerY + 18,
    { align: "center" }
  );

  const filename = `Factura_${invoice.invoiceNumber.replace(/\//g, "-")}_${invoice.invoiceDate}.pdf`;
  doc.save(filename);
}