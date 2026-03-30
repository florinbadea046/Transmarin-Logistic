import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Employee, AttendanceStatus } from "@/modules/hr/types";

// ── Constants ─────────────────────────────────────────────
export const COLUMN_VISIBILITY = { department: false };
export const ALL_DEPARTMENTS = "ALL";

// Statusuri interzise pe weekend (CO, LP = doar zile lucrătoare)
// #1 — ReadonlySet previne mutarea accidentală din exterior
export const WEEKEND_BLOCKED: ReadonlySet<AttendanceStatus> = new Set(["CO", "LP"]);

// ── Row type ──────────────────────────────────────────────
export type AttendanceRow = {
  employee: Employee;
  days: Record<string, AttendanceStatus | undefined>;
};

// ── Status config ─────────────────────────────────────────
// #1 — readonly previne mutarea accidentală din exterior
export const STATUS_CYCLE: readonly (AttendanceStatus | undefined)[] = [
  undefined,
  "P",
  "CO",
  "CM",
  "A",
  "LP",
];

export const STATUS_CONFIG: Record<
  AttendanceStatus,
  { label: string; cellClass: string }
> = {
  P: {
    label: "P",
    cellClass:
      "bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/30 hover:bg-green-500/25",
  },
  CO: {
    label: "CO",
    cellClass:
      "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 hover:bg-blue-500/25",
  },
  CM: {
    label: "CM",
    cellClass:
      "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/25",
  },
  A: {
    label: "A",
    cellClass:
      "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 hover:bg-red-500/25",
  },
  LP: {
    label: "LP",
    cellClass:
      "bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 hover:bg-purple-500/25",
  },
};

// ── PDF helpers ───────────────────────────────────────────
export function safe(text = ""): string {
  return text
    .replace(/[ăâ]/g, "a")
    .replace(/[ĂÂ]/g, "A")
    .replace(/[î]/g, "i")
    .replace(/[Î]/g, "I")
    .replace(/[șş]/g, "s")
    .replace(/[ȘŞ]/g, "S")
    .replace(/[țţ]/g, "t")
    .replace(/[ȚŢ]/g, "T");
}

export function exportAttendancePDF(
  rows: AttendanceRow[],
  days: { day: number; date: string }[],
  monthLabel: string,
  t: (key: string, opts?: Record<string, unknown>) => string,
  locale = "ro-RO",
) {
  // #2 — guard: nu genera PDF gol dacă nu există angajați vizibili
  if (rows.length === 0) return;

  const doc = new jsPDF({ orientation: "landscape" });

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(safe(`${t("attendance.pdf.title")} - ${monthLabel}`), 14, 16);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`${t("attendance.pdf.generated")} ${safe(new Date().toLocaleDateString(locale))}`, 14, 22);

  const head = [
    [t("attendance.columns.employee"), ...days.map((d) => String(d.day)), "P", "CO/CM", "A", "LP"],
  ];

  const body = rows.map(({ employee, days: dayMap }) => {
    const statuses = days.map((d) => dayMap[d.date] ?? "");
    const totals = statuses.reduce(
      (acc, s) => {
        if (s === "P") acc.P++;
        else if (s === "CO" || s === "CM") acc.C++;
        else if (s === "A") acc.A++;
        else if (s === "LP") acc.LP++;
        return acc;
      },
      { P: 0, C: 0, A: 0, LP: 0 },
    );
    return [
      safe(employee.name),
      ...statuses,
      String(totals.P),
      String(totals.C),
      String(totals.A),
      String(totals.LP),
    ];
  });

  autoTable(doc, {
    head,
    body,
    startY: 28,
    styles: { fontSize: 7, cellPadding: 1.5, halign: "center" },
    headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: "bold" },
    columnStyles: { 0: { halign: "left", cellWidth: 38 } },
    alternateRowStyles: { fillColor: [248, 248, 248] },
  });

  doc.save(`pontaj-${safe(monthLabel).replace(/\s+/g, "-")}.pdf`);
}
