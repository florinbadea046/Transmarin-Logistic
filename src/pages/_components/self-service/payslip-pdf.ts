// Construire date fluturaș + generator PDF jsPDF
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { ro, enGB } from "date-fns/locale";
import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import { formatCurrency, formatDate } from "@/utils/format";
import type { Employee, Bonus } from "@/modules/hr/types";
import type { Driver, Trip } from "@/modules/transport/types";

type TFn = (key: string, opts?: Record<string, unknown>) => string;

const DIURNA_PER_DAY = 50;

export interface PayslipData {
  employee: Employee;
  month: string;
  monthLabel: string;
  salaryBase: number;
  diurna: number;
  bonusuri: number;
  amenzi: number;
  oreSuplimentare: number;
  totalNet: number;
  bonusItems: Bonus[];
}

export function getMonthOptions(
  lang: "ro" | "en" = "ro",
): { value: string; label: string }[] {
  const locale = lang === "en" ? enGB : ro;
  const now = new Date();
  const out: { value: string; label: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    out.push({ value, label: format(d, "LLLL yyyy", { locale }) });
  }
  return out;
}

function getTripDays(trip: Trip): number {
  const days =
    differenceInCalendarDays(
      parseISO(trip.estimatedArrivalDate),
      parseISO(trip.departureDate),
    ) + 1;
  return Math.max(days, 1);
}

export interface PayslipSource {
  bonuses: Bonus[];
  drivers: Driver[];
  trips: Trip[];
}

export function loadPayslipSource(): PayslipSource {
  return {
    bonuses: getCollection<Bonus>(STORAGE_KEYS.bonuses),
    drivers: getCollection<Driver>(STORAGE_KEYS.drivers),
    trips: getCollection<Trip>(STORAGE_KEYS.trips),
  };
}

export function buildPayslip(
  employee: Employee,
  month: string,
  lang: "ro" | "en" = "ro",
  source: PayslipSource = loadPayslipSource(),
): PayslipData {
  const bonuses = source.bonuses.filter(
    (b) => b.employeeId === employee.id && b.date.startsWith(month),
  );
  const driverIds = new Set(
    source.drivers
      .filter((d) => d.employeeId === employee.id)
      .map((d) => d.id),
  );

  const empTrips = source.trips.filter(
    (t) =>
      t.status === "finalizata" &&
      driverIds.has(t.driverId) &&
      t.estimatedArrivalDate.startsWith(month),
  );
  const diurna = empTrips.reduce(
    (s, t) => s + getTripDays(t) * DIURNA_PER_DAY,
    0,
  );

  const bonusuri = bonuses
    .filter((b) => b.type === "bonus")
    .reduce((s, b) => s + Math.abs(b.amount), 0);
  const amenzi = bonuses
    .filter((b) => b.type === "amenda")
    .reduce((s, b) => s + Math.abs(b.amount), 0);
  const oreSuplimentare = bonuses
    .filter((b) => b.type === "ore_suplimentare")
    .reduce((s, b) => s + Math.abs(b.amount), 0);

  const monthDate = parseISO(`${month}-01`);
  const monthLocale = lang === "en" ? enGB : ro;
  return {
    employee,
    month,
    monthLabel: format(monthDate, "LLLL yyyy", { locale: monthLocale }),
    salaryBase: employee.salary,
    diurna,
    bonusuri,
    amenzi,
    oreSuplimentare,
    totalNet: employee.salary + diurna + bonusuri + oreSuplimentare - amenzi,
    bonusItems: bonuses,
  };
}

export function generatePayslipPDF(p: PayslipData, t: TFn): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const NAVY: [number, number, number] = [15, 40, 80];
  const ACCENT: [number, number, number] = [0, 112, 192];
  const WHITE: [number, number, number] = [255, 255, 255];
  const GRAY: [number, number, number] = [110, 110, 110];
  const BLACK: [number, number, number] = [30, 30, 30];
  const pageW = 210;
  const margin = 14;

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 32, "F");
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("TRANSMARIN", margin, 14);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("LOGISTIC SRL", margin, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(t("hr.selfService.pdf.title"), pageW - margin, 15, {
    align: "right",
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(p.monthLabel.toUpperCase(), pageW - margin, 22, { align: "right" });

  let y = 42;
  doc.setTextColor(...ACCENT);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(t("hr.selfService.pdf.employeeHeader"), margin, y);
  y += 5;
  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  doc.setTextColor(...BLACK);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  const rows: [string, string][] = [
    [t("hr.selfService.pdf.labels.name"), p.employee.name],
    [t("hr.selfService.pdf.labels.position"), t(`hr.selfService.positions.${p.employee.position}`, { defaultValue: p.employee.position })],
    [t("hr.selfService.pdf.labels.department"), t(`hr.selfService.departments.${p.employee.department}`, { defaultValue: p.employee.department })],
    [t("hr.selfService.pdf.labels.hireDate"), formatDate(p.employee.hireDate)],
  ];
  rows.forEach(([k, v]) => {
    doc.setTextColor(...GRAY);
    doc.text(k, margin, y);
    doc.setTextColor(...BLACK);
    doc.text(v, margin + 32, y);
    y += 5.5;
  });

  y += 4;
  autoTable(doc, {
    startY: y,
    head: [
      [
        t("hr.selfService.pdf.tableHead.item"),
        t("hr.selfService.pdf.tableHead.amount"),
      ],
    ],
    body: [
      [t("hr.selfService.pdf.rows.base"), formatCurrency(p.salaryBase)],
      [t("hr.selfService.pdf.rows.diurna"), formatCurrency(p.diurna)],
      [t("hr.selfService.pdf.rows.bonuses"), formatCurrency(p.bonusuri)],
      [t("hr.selfService.pdf.rows.overtime"), formatCurrency(p.oreSuplimentare)],
      [t("hr.selfService.pdf.rows.fines"), `- ${formatCurrency(p.amenzi)}`],
    ],
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 10,
      cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 },
      textColor: BLACK,
      lineColor: [210, 220, 235],
      lineWidth: 0.3,
    },
    headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [247, 250, 255] },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 60, halign: "right", fontStyle: "bold" },
    },
  });

  const finalY: number =
    (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ??
    y + 30;

  let ty = finalY + 4;
  doc.setFillColor(...NAVY);
  doc.rect(margin, ty, pageW - margin * 2, 12, "F");
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(t("hr.selfService.pdf.totalNet"), margin + 4, ty + 8);
  doc.text(formatCurrency(p.totalNet), pageW - margin - 4, ty + 8, {
    align: "right",
  });
  ty += 18;

  if (p.bonusItems.length > 0) {
    doc.setTextColor(...ACCENT);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(t("hr.selfService.pdf.detailsHeader"), margin, ty);
    ty += 3;
    autoTable(doc, {
      startY: ty,
      head: [
        [
          t("hr.selfService.pdf.bonusHead.date"),
          t("hr.selfService.pdf.bonusHead.type"),
          t("hr.selfService.pdf.bonusHead.description"),
          t("hr.selfService.pdf.bonusHead.amount"),
        ],
      ],
      body: p.bonusItems.map((b) => [
        formatDate(b.date),
        t(`hr.selfService.pdf.types.${b.type}`),
        b.description || "—",
        `${b.type === "amenda" ? "- " : ""}${formatCurrency(Math.abs(b.amount))}`,
      ]),
      margin: { left: margin, right: margin },
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: ACCENT, textColor: WHITE },
      columnStyles: { 3: { halign: "right" } },
    });
  }

  const footerY = 280;
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, footerY, pageW - margin, footerY);
  doc.setTextColor(...GRAY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(t("hr.selfService.pdf.footer"), pageW / 2, footerY + 5, {
    align: "center",
  });

  const safeName = p.employee.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const prefix = t("hr.selfService.pdf.filename");
  doc.save(`${prefix}_${safeName}_${p.month}.pdf`);
}
