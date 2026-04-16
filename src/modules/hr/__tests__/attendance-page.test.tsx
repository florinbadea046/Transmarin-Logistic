// @vitest-environment jsdom
// ──────────────────────────────────────────────────────────
// Component tests: Attendance page (smoke + render)
// File: src/modules/hr/pages/attendance.tsx
// Status cycle/PDF export covered in attendance-shared.test.ts
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

import AttendancePage from "@/modules/hr/pages/attendance";
import { STORAGE_KEYS } from "@/data/mock-data";
import { setCollection } from "@/utils/local-storage";
import type { Employee } from "@/modules/hr/types";

const employees: Employee[] = [
  { id: "e1", name: "Ion Popescu", position: "Sofer", department: "Transport", phone: "0721000001", email: "ion@x", hireDate: "2024-01-01", salary: 5000, documents: [] },
  { id: "e2", name: "Maria Pop", position: "Dispecer", department: "Dispecerat", phone: "0721000002", email: "maria@x", hireDate: "2024-01-01", salary: 6000, documents: [] },
];

describe("AttendancePage", () => {
  beforeEach(() => {
    localStorage.clear();
    setCollection(STORAGE_KEYS.employees, employees);
  });

  it("renders without crashing", () => {
    expect(() => render(<AttendancePage />)).not.toThrow();
  });

  it("renders all employees as rows in the timesheet", () => {
    render(<AttendancePage />);
    expect(screen.getByText("Ion Popescu")).toBeInTheDocument();
    expect(screen.getByText("Maria Pop")).toBeInTheDocument();
  });

  it("handles empty employee list gracefully", () => {
    setCollection<Employee>(STORAGE_KEYS.employees, []);
    render(<AttendancePage />);
    expect(screen.queryByText("Ion Popescu")).not.toBeInTheDocument();
  });
});
