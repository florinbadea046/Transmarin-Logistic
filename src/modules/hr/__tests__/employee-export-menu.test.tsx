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

import { EmployeeExportMenu } from "@/modules/hr/components/employee-export-menu";
import type { Employee } from "@/modules/hr/types";

const employees: Employee[] = [
  {
    id: "e1",
    name: "Ion Popescu",
    position: "Sofer",
    department: "Transport",
    phone: "0721234567",
    email: "ion@x.com",
    hireDate: "2024-01-15",
    salary: 5000,
    documents: [],
  },
  {
    id: "e2",
    name: "Maria Pop",
    position: "Dispecer",
    department: "Dispecerat",
    phone: "0721234568",
    email: "maria@x.com",
    hireDate: "2023-03-10",
    salary: 6000,
    documents: [],
  },
];

describe("EmployeeExportMenu", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the export trigger button", () => {
    render(<EmployeeExportMenu employees={employees} />);
    expect(screen.getByRole("button", { name: /export/i })).toBeInTheDocument();
  });

  it("renders icon-only trigger when iconOnly", () => {
    render(<EmployeeExportMenu employees={employees} iconOnly />);
    const btn = screen.getByRole("button", { name: /employees.actions.export/i });
    expect(btn).toBeInTheDocument();
  });

  it("clicking PDF item triggers jsPDF save", async () => {
    const user = userEvent.setup();
    render(<EmployeeExportMenu employees={employees} />);
    await user.click(screen.getByRole("button", { name: /export/i }));
    await user.click(await screen.findByText(/exportPdf/i));
    expect(m.save).toHaveBeenCalledWith(expect.stringContaining(".pdf"));
  });

  it("clicking Excel item triggers XLSX writeFile", async () => {
    const user = userEvent.setup();
    render(<EmployeeExportMenu employees={employees} />);
    await user.click(screen.getByRole("button", { name: /export/i }));
    await user.click(await screen.findByText(/exportExcel/i));
    expect(m.writeFile).toHaveBeenCalledWith(expect.anything(), expect.stringContaining(".xlsx"));
  });

  it("clicking CSV item triggers Papa.unparse", async () => {
    const user = userEvent.setup();
    render(<EmployeeExportMenu employees={employees} />);
    await user.click(screen.getByRole("button", { name: /export/i }));
    await user.click(await screen.findByText(/exportCsv/i));
    expect(m.unparse).toHaveBeenCalledOnce();
  });

  it("Excel sheet rows include all employees", async () => {
    const user = userEvent.setup();
    render(<EmployeeExportMenu employees={employees} />);
    await user.click(screen.getByRole("button", { name: /export/i }));
    await user.click(await screen.findByText(/exportExcel/i));
    const rows = ((m.jsonToSheet.mock.calls as unknown[][])[0]?.[0] ?? []) as Record<string, unknown>[];
    expect(rows).toHaveLength(2);
  });
});
