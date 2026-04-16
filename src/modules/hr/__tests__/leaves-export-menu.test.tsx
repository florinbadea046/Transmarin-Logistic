// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const m = vi.hoisted(() => ({
  save: vi.fn(),
  text: vi.fn(),
  setFontSize: vi.fn(),
  setTextColor: vi.fn(),
  setFont: vi.fn(),
  autoTable: vi.fn(),
  jsonToSheet: vi.fn(() => ({})),
  bookNew: vi.fn(() => ({})),
  bookAppendSheet: vi.fn(),
  writeFile: vi.fn(),
  unparse: vi.fn(() => "x\n1"),
}));

vi.mock("jspdf", () => ({
  default: vi.fn(function (this: Record<string, unknown>) {
    this.setFontSize = m.setFontSize;
    this.text = m.text;
    this.setTextColor = m.setTextColor;
    this.setFont = m.setFont;
    this.save = m.save;
  }),
}));

vi.mock("jspdf-autotable", () => ({ default: m.autoTable }));

vi.mock("xlsx", () => ({
  utils: {
    json_to_sheet: m.jsonToSheet,
    book_new: m.bookNew,
    book_append_sheet: m.bookAppendSheet,
  },
  writeFile: m.writeFile,
}));

vi.mock("papaparse", () => ({
  default: { unparse: m.unparse },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

import { LeavesExportMenu } from "@/modules/hr/components/leaves-export-menu";
import type { LeaveRequest } from "@/modules/hr/types";

type LeaveRow = LeaveRequest & { employeeName: string };

const rows: LeaveRow[] = [
  {
    id: "l1",
    employeeId: "e1",
    employeeName: "Ion Popescu",
    type: "annual",
    startDate: "2026-04-10",
    endDate: "2026-04-15",
    days: 5,
    status: "approved",
    reason: "Vacanta",
  },
  {
    id: "l2",
    employeeId: "e2",
    employeeName: "Maria Pop",
    type: "sick",
    startDate: "2026-05-01",
    endDate: "2026-05-03",
    days: 3,
    status: "pending",
  },
];

describe("LeavesExportMenu", () => {
  beforeEach(() => vi.clearAllMocks());

  it("disables button when rows empty", () => {
    render(<LeavesExportMenu rows={[]} />);
    expect(screen.getByRole("button", { name: /leaves.export.button/i })).toBeDisabled();
  });

  it("enables button with rows", () => {
    render(<LeavesExportMenu rows={rows} />);
    expect(screen.getByRole("button", { name: /leaves.export.button/i })).not.toBeDisabled();
  });

  it("PDF export uses landscape orientation (calls autoTable)", async () => {
    const user = userEvent.setup();
    render(<LeavesExportMenu rows={rows} />);
    await user.click(screen.getByRole("button", { name: /leaves.export.button/i }));
    await user.click(await screen.findByText(/leaves.export.pdf/i));
    expect(m.autoTable).toHaveBeenCalledOnce();
  });

  it("Excel export translates type & status labels", async () => {
    const user = userEvent.setup();
    render(<LeavesExportMenu rows={rows} />);
    await user.click(screen.getByRole("button", { name: /leaves.export.button/i }));
    await user.click(await screen.findByText(/leaves.export.excel/i));
    const xlsxRows = ((m.jsonToSheet.mock.calls as unknown[][])[0]?.[0] ?? []) as Record<string, unknown>[];
    const ion = xlsxRows.find((r) => r["leavesExport.cols.employee"] === "Ion Popescu");
    expect(ion?.["leavesExport.cols.type"]).toBe("leavesExport.types.annual");
    expect(ion?.["leavesExport.cols.status"]).toBe("leavesExport.status.approved");
  });

  it("uses empty string for missing reason", async () => {
    const user = userEvent.setup();
    render(<LeavesExportMenu rows={rows} />);
    await user.click(screen.getByRole("button", { name: /leaves.export.button/i }));
    await user.click(await screen.findByText(/leaves.export.excel/i));
    const xlsxRows = ((m.jsonToSheet.mock.calls as unknown[][])[0]?.[0] ?? []) as Record<string, unknown>[];
    const maria = xlsxRows.find((r) => r["leavesExport.cols.employee"] === "Maria Pop");
    expect(maria?.["leavesExport.cols.reason"]).toBe("");
  });

  it("CSV export calls Papa.unparse", async () => {
    const user = userEvent.setup();
    render(<LeavesExportMenu rows={rows} />);
    await user.click(screen.getByRole("button", { name: /leaves.export.button/i }));
    await user.click(await screen.findByText(/leaves.export.csv/i));
    expect(m.unparse).toHaveBeenCalledOnce();
  });
});
