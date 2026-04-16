import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({
  save: vi.fn(),
  text: vi.fn(),
  setFontSize: vi.fn(),
  setFont: vi.fn(),
  autoTable: vi.fn(),
}));

vi.mock("jspdf", () => ({
  default: vi.fn(function (this: Record<string, unknown>) {
    this.setFontSize = m.setFontSize;
    this.text = m.text;
    this.setFont = m.setFont;
    this.save = m.save;
  }),
}));

vi.mock("jspdf-autotable", () => ({ default: m.autoTable }));

import {
  STATUS_CYCLE,
  STATUS_CONFIG,
  WEEKEND_BLOCKED,
  ALL_DEPARTMENTS,
  COLUMN_VISIBILITY,
  safe,
  exportAttendancePDF,
  type AttendanceRow,
} from "@/modules/hr/pages/attendance-shared";

const t = (k: string) => k;

describe("constants", () => {
  it("STATUS_CYCLE has 6 entries (undefined + 5 statuses)", () => {
    expect(STATUS_CYCLE).toHaveLength(6);
    expect(STATUS_CYCLE[0]).toBeUndefined();
    expect(STATUS_CYCLE).toContain("P");
    expect(STATUS_CYCLE).toContain("LP");
  });

  it("STATUS_CONFIG covers all 5 statuses with classes", () => {
    expect(Object.keys(STATUS_CONFIG).sort()).toEqual(["A", "CM", "CO", "LP", "P"]);
    Object.values(STATUS_CONFIG).forEach((cfg) => {
      expect(cfg.label).toBeTruthy();
      expect(cfg.cellClass).toContain("border");
    });
  });

  it("WEEKEND_BLOCKED contains CO and LP only", () => {
    expect(WEEKEND_BLOCKED.has("CO")).toBe(true);
    expect(WEEKEND_BLOCKED.has("LP")).toBe(true);
    expect(WEEKEND_BLOCKED.has("P")).toBe(false);
    expect(WEEKEND_BLOCKED.has("A")).toBe(false);
    expect(WEEKEND_BLOCKED.has("CM")).toBe(false);
  });

  it("ALL_DEPARTMENTS sentinel is set", () => {
    expect(ALL_DEPARTMENTS).toBe("ALL");
  });

  it("COLUMN_VISIBILITY hides department by default", () => {
    expect(COLUMN_VISIBILITY.department).toBe(false);
  });
});

describe("safe (PDF text strip)", () => {
  it("normalizes Romanian diacritics for PDF", () => {
    expect(safe("Constanța")).toBe("Constanta");
    expect(safe("Iași")).toBe("Iasi");
    expect(safe("Bucureștiu Brașov")).toBe("Bucurestiu Brasov");
  });

  it("returns empty for default missing arg", () => {
    expect(safe()).toBe("");
  });
});

describe("exportAttendancePDF", () => {
  beforeEach(() => vi.clearAllMocks());

  const rows: AttendanceRow[] = [
    {
      employee: {
        id: "e1",
        name: "Ion Popescu",
        position: "Sofer",
        department: "Transport",
        phone: "0721234567",
        email: "ion@x.com",
        hireDate: "2024-01-01",
        salary: 5000,
        documents: [],
      },
      days: {
        "2026-04-01": "P",
        "2026-04-02": "CO",
        "2026-04-03": "CM",
        "2026-04-04": "A",
        "2026-04-05": "LP",
      },
    },
  ];

  const days = [
    { day: 1, date: "2026-04-01" },
    { day: 2, date: "2026-04-02" },
    { day: 3, date: "2026-04-03" },
    { day: 4, date: "2026-04-04" },
    { day: 5, date: "2026-04-05" },
  ];

  it("does nothing when no rows", () => {
    exportAttendancePDF([], days, "April 2026", t);
    expect(m.autoTable).not.toHaveBeenCalled();
    expect(m.save).not.toHaveBeenCalled();
  });

  it("calls autoTable with correct head structure", () => {
    exportAttendancePDF(rows, days, "April 2026", t);
    const call = m.autoTable.mock.calls[0][1] as { head: string[][] };
    expect(call.head[0][0]).toBe("attendance.columns.employee");
    expect(call.head[0]).toContain("P");
    expect(call.head[0]).toContain("LP");
  });

  it("computes per-status totals in the body", () => {
    exportAttendancePDF(rows, days, "April 2026", t);
    const call = m.autoTable.mock.calls[0][1] as { body: string[][] };
    const row = call.body[0];
    // Last 4 columns are P, CO/CM, A, LP totals
    expect(row[row.length - 4]).toBe("1"); // P
    expect(row[row.length - 3]).toBe("2"); // CO + CM
    expect(row[row.length - 2]).toBe("1"); // A
    expect(row[row.length - 1]).toBe("1"); // LP
  });

  it("saves with month-suffixed filename", () => {
    exportAttendancePDF(rows, days, "April 2026", t);
    expect(m.save).toHaveBeenCalledWith(expect.stringMatching(/pontaj-April-2026\.pdf$/));
  });
});
