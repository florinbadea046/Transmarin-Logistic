// @vitest-environment jsdom
// ──────────────────────────────────────────────────────────
// Component tests: Evaluations page (smoke + render)
// File: src/modules/hr/pages/evaluations.tsx
// Score calc / RadarChart covered in evaluations-types.test.ts
// ──────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
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

import EvaluationsPage from "@/modules/hr/pages/evaluations";
import { STORAGE_KEYS } from "@/data/mock-data";
import { setCollection } from "@/utils/local-storage";
import type { Employee } from "@/modules/hr/types";

const employees: Employee[] = [
  { id: "e1", name: "Ion Popescu", position: "Sofer", department: "Transport", phone: "0721000001", email: "ion@x", hireDate: "2024-01-01", salary: 5000, documents: [] },
];

describe("EvaluationsPage", () => {
  beforeEach(() => {
    localStorage.clear();
    setCollection(STORAGE_KEYS.employees, employees);
  });

  it("renders without crashing", () => {
    expect(() => render(<EvaluationsPage />)).not.toThrow();
  });

  it("renders without errors when no evaluations exist", () => {
    setCollection(STORAGE_KEYS.evaluations, []);
    render(<EvaluationsPage />);
    // Page should render with no crash
    expect(document.body).toBeTruthy();
  });
});
