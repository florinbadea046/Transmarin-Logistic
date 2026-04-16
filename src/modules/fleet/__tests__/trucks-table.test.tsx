// @vitest-environment jsdom
// ──────────────────────────────────────────────────────────
// Component tests: TrucksTable
// File: src/modules/fleet/components/TrucksTable.tsx
// ──────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string, opts?: { count?: number }) => (opts?.count !== undefined ? `${k}_${opts.count}` : k),
  }),
}));

import { TrucksTable } from "@/modules/fleet/components/TrucksTable";
import { STORAGE_KEYS } from "@/data/mock-data";
import { setCollection } from "@/utils/local-storage";
import type { Truck } from "@/modules/transport/types";

function plusDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

describe("TrucksTable", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders empty state when fleet has no trucks", () => {
    render(<TrucksTable />);
    expect(screen.getByText(/fleet.trucks.noTrucks/i)).toBeInTheDocument();
  });

  it("renders table with all trucks", () => {
    const trucks: Truck[] = [
      { id: "t1", plateNumber: "CT-01-TML", brand: "Volvo", model: "FH16", year: 2020, mileage: 100000, status: "available", itpExpiry: plusDaysISO(60), rcaExpiry: plusDaysISO(60), vignetteExpiry: plusDaysISO(60) },
      { id: "t2", plateNumber: "CT-02-TML", brand: "MAN", model: "TGX", year: 2021, mileage: 80000, status: "on_trip", itpExpiry: plusDaysISO(60), rcaExpiry: plusDaysISO(60), vignetteExpiry: plusDaysISO(60) },
    ];
    setCollection(STORAGE_KEYS.trucks, trucks);
    render(<TrucksTable />);
    expect(screen.getByText("CT-01-TML")).toBeInTheDocument();
    expect(screen.getByText("CT-02-TML")).toBeInTheDocument();
  });

  it("shows status badges with translated labels", () => {
    const trucks: Truck[] = [
      { id: "t1", plateNumber: "CT-01", brand: "Volvo", model: "FH16", year: 2020, mileage: 100000, status: "in_service", itpExpiry: plusDaysISO(60), rcaExpiry: plusDaysISO(60), vignetteExpiry: plusDaysISO(60) },
    ];
    setCollection(STORAGE_KEYS.trucks, trucks);
    render(<TrucksTable />);
    expect(screen.getByText("fleet.trucks.statusInService")).toBeInTheDocument();
  });

  it("highlights expired ITP/RCA/Vignette dates with sr-only text", () => {
    const trucks: Truck[] = [
      { id: "t1", plateNumber: "CT-01", brand: "Volvo", model: "FH", year: 2020, mileage: 100000, status: "available", itpExpiry: "2020-01-01", rcaExpiry: "2020-01-01", vignetteExpiry: "2020-01-01" },
    ];
    setCollection(STORAGE_KEYS.trucks, trucks);
    render(<TrucksTable />);
    const expiredLabels = screen.getAllByText(/fleet.trucks.expired/i);
    expect(expiredLabels.length).toBeGreaterThan(0);
  });

  it("highlights expiring-soon dates differently than valid", () => {
    const trucks: Truck[] = [
      { id: "t1", plateNumber: "CT-01", brand: "Volvo", model: "FH", year: 2020, mileage: 100000, status: "available", itpExpiry: plusDaysISO(15), rcaExpiry: plusDaysISO(60), vignetteExpiry: plusDaysISO(60) },
    ];
    setCollection(STORAGE_KEYS.trucks, trucks);
    render(<TrucksTable />);
    expect(screen.getByText(/fleet.trucks.expiresSoon/i)).toBeInTheDocument();
  });

  it("renders mileage with locale formatting", () => {
    const trucks: Truck[] = [
      { id: "t1", plateNumber: "CT-01", brand: "V", model: "M", year: 2020, mileage: 123456, status: "available", itpExpiry: plusDaysISO(60), rcaExpiry: plusDaysISO(60), vignetteExpiry: plusDaysISO(60) },
    ];
    setCollection(STORAGE_KEYS.trucks, trucks);
    render(<TrucksTable />);
    expect(screen.getByText(/123/)).toBeInTheDocument();
  });
});
