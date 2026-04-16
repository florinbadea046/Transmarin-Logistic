// @vitest-environment jsdom
// ──────────────────────────────────────────────────────────
// Component tests: FinancialReports page (smoke + render)
// File: src/modules/reports/pages/financial-reports.tsx
// Pure utils covered in financial-reports-utils.test.ts
// ──────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
import * as React from "react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("@tanstack/react-router", () => ({
  useLocation: () => ({ pathname: "/reports/financial" }),
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
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
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
}));

import FinancialReports from "@/modules/reports/pages/financial-reports";
import { STORAGE_KEYS } from "@/data/mock-data";
import { setCollection } from "@/utils/local-storage";
import type { Invoice } from "@/modules/accounting/types";

const invoices: Invoice[] = [
  {
    id: "1", type: "income", number: "FACT-001", date: "2026-04-10", dueDate: "2026-05-10",
    clientName: "Alpha SRL",
    items: [{ description: "Transport", quantity: 1, unitPrice: 1000, total: 1000 }],
    totalWithoutVAT: 840.34, vat: 159.66, total: 1000, status: "paid",
  },
  {
    id: "2", type: "expense", number: "CHELT-001", date: "2026-04-15", dueDate: "2026-05-15",
    clientName: "Beta SA",
    items: [{ description: "Combustibil", quantity: 1, unitPrice: 500, total: 500 }],
    totalWithoutVAT: 420.17, vat: 79.83, total: 500, status: "paid",
  },
];

describe("FinancialReports", () => {
  beforeEach(() => {
    localStorage.clear();
    setCollection(STORAGE_KEYS.invoices, invoices);
  });

  it("renders without crashing", () => {
    expect(() => render(<FinancialReports />)).not.toThrow();
  });

  it("renders page even when invoices list is empty", () => {
    setCollection<Invoice>(STORAGE_KEYS.invoices, []);
    expect(() => render(<FinancialReports />)).not.toThrow();
  });
});
