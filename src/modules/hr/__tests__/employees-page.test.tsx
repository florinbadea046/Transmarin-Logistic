// @vitest-environment jsdom
// ──────────────────────────────────────────────────────────
// Component tests: Employees page (smoke + render checks)
// File: src/modules/hr/pages/employees.tsx
// ──────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import * as React from "react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
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

import EmployeesPage from "@/modules/hr/pages/employees";
import { STORAGE_KEYS } from "@/data/mock-data";
import { setCollection } from "@/utils/local-storage";
import type { Employee } from "@/modules/hr/types";

const employees: Employee[] = [
  { id: "e1", name: "Ion Popescu", position: "Sofer", department: "Transport", phone: "0721000001", email: "ion@x.com", hireDate: "2024-01-15", salary: 5000, documents: [] },
  { id: "e2", name: "Maria Pop", position: "Dispecer", department: "Dispecerat", phone: "0721000002", email: "maria@x.com", hireDate: "2023-03-10", salary: 6000, documents: [] },
];

describe("EmployeesPage", () => {
  beforeEach(() => {
    localStorage.clear();
    setCollection(STORAGE_KEYS.employees, employees);
  });

  it("renders without crashing", () => {
    expect(() => render(<EmployeesPage />)).not.toThrow();
  });

  it("displays all employees from storage", () => {
    render(<EmployeesPage />);
    expect(screen.getByText("Ion Popescu")).toBeInTheDocument();
    expect(screen.getByText("Maria Pop")).toBeInTheDocument();
  });

  it("renders employee positions", () => {
    render(<EmployeesPage />);
    expect(screen.getByText("Sofer")).toBeInTheDocument();
    expect(screen.getByText("Dispecer")).toBeInTheDocument();
  });

  it("renders email addresses for employees", () => {
    render(<EmployeesPage />);
    expect(screen.getByText("ion@x.com")).toBeInTheDocument();
    expect(screen.getByText("maria@x.com")).toBeInTheDocument();
  });

  it("renders department badges", () => {
    render(<EmployeesPage />);
    expect(screen.getAllByText(/Transport/i).length).toBeGreaterThan(0);
  });

  it("handles empty employee list gracefully", () => {
    setCollection<Employee>(STORAGE_KEYS.employees, []);
    render(<EmployeesPage />);
    expect(screen.queryByText("Ion Popescu")).not.toBeInTheDocument();
  });
});
