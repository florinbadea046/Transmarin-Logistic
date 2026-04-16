// @vitest-environment jsdom
// ──────────────────────────────────────────────────────────
// Component tests: ReportsHR page (smoke + render)
// File: src/modules/reports/pages/reports-hr.tsx
// ──────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
import * as React from "react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: "ro" } }),
}));

vi.mock("@tanstack/react-router", () => ({
  useLocation: () => ({ pathname: "/reports/hr" }),
  useNavigate: () => vi.fn(),
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

vi.mock("@/components/layout/header", () => ({
  Header: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/layout/main", () => ({
  Main: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("recharts", () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => null,
  PieChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Pie: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Line: () => null,
  RadialBarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  RadialBar: () => null,
}));

import ReportsHR from "@/modules/reports/pages/reports-hr";
import { STORAGE_KEYS } from "@/data/mock-data";
import { setCollection } from "@/utils/local-storage";
import type { Employee } from "@/modules/hr/types";

const employees: Employee[] = [
  { id: "e1", name: "Ion Popescu", position: "Sofer", department: "Transport", phone: "0721000001", email: "ion@x", hireDate: "2024-01-01", salary: 5000, documents: [] },
];

describe("ReportsHR", () => {
  beforeEach(() => {
    localStorage.clear();
    setCollection(STORAGE_KEYS.employees, employees);
    setCollection(STORAGE_KEYS.leaveRequests, []);
    setCollection(STORAGE_KEYS.bonuses, []);
    setCollection(STORAGE_KEYS.attendance, []);
  });

  it("renders without crashing", () => {
    expect(() => render(<ReportsHR />)).not.toThrow();
  });

  it("renders without crashing for empty data sets", () => {
    setCollection<Employee>(STORAGE_KEYS.employees, []);
    expect(() => render(<ReportsHR />)).not.toThrow();
  });
});
