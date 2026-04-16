// @vitest-environment jsdom
// ──────────────────────────────────────────────────────────
// Component tests: FleetReports page (smoke + render)
// File: src/modules/reports/pages/fleet-reports.tsx
// ──────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
import * as React from "react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("@tanstack/react-router", () => ({
  useLocation: () => ({ pathname: "/reports/fleet" }),
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
}));

import FleetReports from "@/modules/reports/pages/fleet-reports";
import { STORAGE_KEYS } from "@/data/mock-data";
import { setCollection } from "@/utils/local-storage";
import type { Truck } from "@/modules/transport/types";

const trucks: Truck[] = [
  { id: "t1", plateNumber: "CT-01-TML", brand: "Volvo", model: "FH16", year: 2020, mileage: 100000, status: "available", itpExpiry: "2027-01-01", rcaExpiry: "2027-01-01", vignetteExpiry: "2027-01-01" },
  { id: "t2", plateNumber: "CT-02-TML", brand: "MAN", model: "TGX", year: 2021, mileage: 80000, status: "in_service", itpExpiry: "2027-01-01", rcaExpiry: "2027-01-01", vignetteExpiry: "2027-01-01" },
];

describe("FleetReports", () => {
  beforeEach(() => {
    localStorage.clear();
    setCollection(STORAGE_KEYS.trucks, trucks);
  });

  it("renders without crashing", () => {
    expect(() => render(<FleetReports />)).not.toThrow();
  });

  it("renders without crashing for empty fleet", () => {
    setCollection<Truck>(STORAGE_KEYS.trucks, []);
    expect(() => render(<FleetReports />)).not.toThrow();
  });
});
