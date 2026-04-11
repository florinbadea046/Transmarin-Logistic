import jsPDF from "jspdf";

export interface CertificatePdfData {
  trainingTitle: string;
  employeeName: string;
  issuedAt: string; // ISO
  trainer?: string;
  durationHours?: number;
}

export function generateCertificatePdf(data: CertificatePdfData): void {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Border
  doc.setLineWidth(1.2);
  doc.setDrawColor(30, 30, 30);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  doc.setLineWidth(0.3);
  doc.rect(14, 14, pageWidth - 28, pageHeight - 28);

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(30);
  doc.text("CERTIFICAT DE PARTICIPARE", pageWidth / 2, 40, {
    align: "center",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.text("Se acorda prezentul certificat domnului/doamnei", pageWidth / 2, 60, {
    align: "center",
  });

  // Employee name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text(data.employeeName, pageWidth / 2, 78, { align: "center" });

  // Training title
  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.text("pentru participarea la training-ul:", pageWidth / 2, 94, {
    align: "center",
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(`"${data.trainingTitle}"`, pageWidth / 2, 108, { align: "center" });

  // Details
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);

  const issuedDate = new Date(data.issuedAt).toLocaleDateString("ro-RO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  doc.text(`Data emiterii: ${issuedDate}`, pageWidth / 2, 126, {
    align: "center",
  });

  if (data.durationHours) {
    doc.text(
      `Durata: ${data.durationHours} ore`,
      pageWidth / 2,
      134,
      { align: "center" },
    );
  }

  if (data.trainer) {
    doc.text(`Trainer: ${data.trainer}`, pageWidth / 2, 142, {
      align: "center",
    });
  }

  // Signature placeholder
  const sigX = pageWidth - 80;
  const sigY = pageHeight - 40;
  doc.setLineWidth(0.4);
  doc.line(sigX, sigY, sigX + 60, sigY);
  doc.setFontSize(10);
  doc.setFont("helvetica", "italic");
  doc.text("Semnatura", sigX + 30, sigY + 6, { align: "center" });

  // Filename
  const safeName = data.employeeName.replace(/[^a-zA-Z0-9]+/g, "_");
  const safeTitle = data.trainingTitle.replace(/[^a-zA-Z0-9]+/g, "_");
  doc.save(`certificat_${safeName}_${safeTitle}.pdf`);
}
