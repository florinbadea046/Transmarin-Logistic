// @vitest-environment jsdom
// ──────────────────────────────────────────────────────────
// Component tests: Payroll page (smoke + render)
// File: src/modules/hr/pages/payroll.tsx
// Salary calc covered in use-payroll-data.test.tsx
// ──────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import * as React from "react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: "ro" } }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/hooks/use-hr-audit-log", () => ({
  useHrAuditLog: () => ({ log: vi.fn() }),
}));

vi.mock("@/components/layout/header", () => ({
  Header: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/layout/main", () => ({
  Main: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/modules/hr/components/payroll-export-menu", () => ({
  PayrollExportMenu: () => <div />,
}));

vi.mock("@/modules/hr/components/bonus-dialog", () => ({
  default: () => <div />,
}));

import PayrollPage from "@/modules/hr/pages/payroll";
import { STORAGE_KEYS } from "@/data/mock-data";
import { setCollection } from "@/utils/local-storage";
import type { Employee } from "@/modules/hr/types";

const employees: Employee[] = [
  { id: "e1", name: "Ion Popescu", position: "Sofer", department: "Transport", phone: "0721000001", email: "ion@x", hireDate: "2024-01-01", salary: 5000, documents: [] },
];

describe("PayrollPage", () => {
  beforeEach(() => {
    localStorage.clear();
    setCollection(STORAGE_KEYS.employees, employees);
  });

  it("renders without crashing", () => {
    expect(() => render(<PayrollPage />)).not.toThrow();
  });

  it("renders all employees in payroll table", () => {
    render(<PayrollPage />);
    expect(screen.getByText("Ion Popescu")).toBeInTheDocument();
  });

  it("handles empty employee list gracefully", () => {
    setCollection<Employee>(STORAGE_KEYS.employees, []);
    render(<PayrollPage />);
    expect(screen.queryByText("Ion Popescu")).not.toBeInTheDocument();
  });
});
