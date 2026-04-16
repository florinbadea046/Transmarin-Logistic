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
  aoaToSheet: vi.fn(() => ({})),
  bookNew: vi.fn(() => ({})),
  bookAppendSheet: vi.fn(),
  writeFile: vi.fn(),
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
    aoa_to_sheet: m.aoaToSheet,
    book_new: m.bookNew,
    book_append_sheet: m.bookAppendSheet,
  },
  writeFile: m.writeFile,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: "ro" } }),
}));

import { PayrollExportMenu } from "@/modules/hr/components/payroll-export-menu";
import type { PayrollRow } from "@/modules/hr/payroll/payroll-shared";

const rows: PayrollRow[] = [
  {
    id: "e1",
    name: "Ion Popescu",
    department: "Transport",
    salary: 5000,
    diurna: 200,
    bonusuri: 100,
    amenzi: -50,
    oreSuplimentare: 80,
    totalNet: 5330,
  },
  {
    id: "e2",
    name: "Maria Pop",
    department: "Dispecerat",
    salary: 6000,
    diurna: 0,
    bonusuri: 0,
    amenzi: 0,
    oreSuplimentare: 0,
    totalNet: 6000,
  },
];

describe("PayrollExportMenu", () => {
  beforeEach(() => vi.clearAllMocks());

  it("disables button when rows empty", () => {
    render(<PayrollExportMenu rows={[]} selectedMonth="2026-04" />);
    expect(screen.getByRole("button", { name: /payroll.export.button/i })).toBeDisabled();
  });

  it("PDF export uses footer row with total", async () => {
    const user = userEvent.setup();
    render(<PayrollExportMenu rows={rows} selectedMonth="2026-04" />);
    await user.click(screen.getByRole("button", { name: /payroll.export.button/i }));
    await user.click(await screen.findByText(/payroll.export.pdf/i));
    const args = m.autoTable.mock.calls[0][1] as { foot?: unknown[][] };
    expect(args.foot).toBeDefined();
    expect(args.foot).toHaveLength(1);
  });

  it("Excel export uses aoa_to_sheet (footer row support)", async () => {
    const user = userEvent.setup();
    render(<PayrollExportMenu rows={rows} selectedMonth="2026-04" />);
    await user.click(screen.getByRole("button", { name: /payroll.export.button/i }));
    await user.click(await screen.findByText(/payroll.export.excel/i));
    expect(m.aoaToSheet).toHaveBeenCalledOnce();
    const data = ((m.aoaToSheet.mock.calls as unknown[][])[0]?.[0] ?? []) as unknown[][];
    // headers + 2 rows + footer
    expect(data.length).toBe(4);
  });

  it("Excel footer contains the sum totalNet", async () => {
    const user = userEvent.setup();
    render(<PayrollExportMenu rows={rows} selectedMonth="2026-04" />);
    await user.click(screen.getByRole("button", { name: /payroll.export.button/i }));
    await user.click(await screen.findByText(/payroll.export.excel/i));
    const data = ((m.aoaToSheet.mock.calls as unknown[][])[0]?.[0] ?? []) as unknown[][];
    const footerRow = data[data.length - 1];
    expect(footerRow[footerRow.length - 1]).toBe(5330 + 6000);
  });

  it("PDF saves with month-suffixed filename", async () => {
    const user = userEvent.setup();
    render(<PayrollExportMenu rows={rows} selectedMonth="2026-04" />);
    await user.click(screen.getByRole("button", { name: /payroll.export.button/i }));
    await user.click(await screen.findByText(/payroll.export.pdf/i));
    expect(m.save).toHaveBeenCalledWith(expect.stringMatching(/2026-04\.pdf$/));
  });
});
