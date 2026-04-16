// @vitest-environment jsdom
// ──────────────────────────────────────────────────────────
// Component tests: LeavesPage (smoke + render)
// File: src/modules/hr/pages/leaves.tsx
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

import LeavesPage from "@/modules/hr/pages/leaves";
import { STORAGE_KEYS } from "@/data/mock-data";
import { setCollection } from "@/utils/local-storage";
import type { Employee, LeaveRequest } from "@/modules/hr/types";

const employees: Employee[] = [
  { id: "e1", name: "Ion Popescu", position: "Sofer", department: "Transport", phone: "0721000001", email: "ion@x", hireDate: "2024-01-01", salary: 5000, documents: [] },
];

const leaves: LeaveRequest[] = [
  { id: "l1", employeeId: "e1", type: "annual", startDate: "2026-04-10", endDate: "2026-04-15", days: 5, status: "approved", reason: "Vacanta" },
  { id: "l2", employeeId: "e1", type: "sick", startDate: "2026-05-01", endDate: "2026-05-03", days: 3, status: "pending" },
];

describe("LeavesPage", () => {
  beforeEach(() => {
    localStorage.clear();
    setCollection(STORAGE_KEYS.employees, employees);
    setCollection(STORAGE_KEYS.leaveRequests, leaves);
  });

  it("renders without crashing", () => {
    expect(() => render(<LeavesPage />)).not.toThrow();
  });

  it("renders all leave requests", () => {
    render(<LeavesPage />);
    expect(screen.getAllByText(/Ion Popescu/).length).toBeGreaterThanOrEqual(1);
  });

  it("renders leave type labels", () => {
    render(<LeavesPage />);
    // status/type shown via badges
    expect(screen.getAllByText(/leaves/).length).toBeGreaterThan(0);
  });

  it("handles empty leaves list gracefully", () => {
    setCollection<LeaveRequest>(STORAGE_KEYS.leaveRequests, []);
    render(<LeavesPage />);
    expect(screen.queryByText("Vacanta")).not.toBeInTheDocument();
  });
});
