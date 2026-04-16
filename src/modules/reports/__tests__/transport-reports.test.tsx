// @vitest-environment jsdom
// ──────────────────────────────────────────────────────────
// Component tests: TransportReports page (smoke + render)
// File: src/modules/reports/pages/transport-reports.tsx
// ──────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
import * as React from "react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("@tanstack/react-router", () => ({
  useLocation: () => ({ pathname: "/reports/transport" }),
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

import TransportReports from "@/modules/reports/pages/transport-reports";
import { STORAGE_KEYS } from "@/data/mock-data";
import { setCollection } from "@/utils/local-storage";

describe("TransportReports", () => {
  beforeEach(() => {
    localStorage.clear();
    setCollection(STORAGE_KEYS.orders, []);
    setCollection(STORAGE_KEYS.trips, []);
    setCollection(STORAGE_KEYS.drivers, []);
    setCollection(STORAGE_KEYS.trucks, []);
  });

  it("renders without crashing", () => {
    expect(() => render(<TransportReports />)).not.toThrow();
  });

  it("renders without crashing when seeded", () => {
    setCollection(STORAGE_KEYS.trips, [
      { id: "t1", orderId: "o1", driverId: "d1", truckId: "tr1", departureDate: "2026-04-10", estimatedArrivalDate: "2026-04-12", kmLoaded: 100, kmEmpty: 50, fuelCost: 200, status: "finalizata" },
    ]);
    expect(() => render(<TransportReports />)).not.toThrow();
  });
});
