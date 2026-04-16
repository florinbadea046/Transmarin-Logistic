// @vitest-environment jsdom
// ──────────────────────────────────────────────────────────
// Component tests: DocExpiryAlerts
// File: src/modules/fleet/components/DocExpiryAlerts.tsx
// ──────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string, opts?: { count?: number; days?: number }) =>
      opts?.count !== undefined
        ? `${k}_${opts.count}`
        : opts?.days !== undefined
          ? `${k}_${opts.days}`
          : k,
  }),
}));

import { DocExpiryAlerts } from "@/modules/fleet/components/DocExpiryAlerts";
import { STORAGE_KEYS } from "@/data/mock-data";
import { setCollection } from "@/utils/local-storage";
import type { Truck } from "@/modules/transport/types";

function plusDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

describe("DocExpiryAlerts", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders nothing when no documents are expiring/expired", () => {
    const trucks: Truck[] = [
      { id: "t1", plateNumber: "CT-01", brand: "Volvo", model: "FH16", year: 2020, mileage: 100000, status: "available", itpExpiry: plusDaysISO(120), rcaExpiry: plusDaysISO(120), vignetteExpiry: plusDaysISO(120) },
    ];
    setCollection(STORAGE_KEYS.trucks, trucks);
    const { container } = render(<DocExpiryAlerts />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the alerts title when there are alerts", () => {
    const trucks: Truck[] = [
      { id: "t1", plateNumber: "CT-01", brand: "Volvo", model: "FH16", year: 2020, mileage: 100000, status: "available", itpExpiry: plusDaysISO(5), rcaExpiry: plusDaysISO(120), vignetteExpiry: plusDaysISO(120) },
    ];
    setCollection(STORAGE_KEYS.trucks, trucks);
    render(<DocExpiryAlerts />);
    expect(screen.getByText(/fleet.docs.alertsTitle/i)).toBeInTheDocument();
  });

  it("counts expired documents separately from soon-expiring ones", () => {
    const trucks: Truck[] = [
      { id: "t1", plateNumber: "CT-01", brand: "Volvo", model: "FH16", year: 2020, mileage: 100000, status: "available", itpExpiry: "2020-01-01", rcaExpiry: plusDaysISO(15), vignetteExpiry: plusDaysISO(120) },
    ];
    setCollection(STORAGE_KEYS.trucks, trucks);
    render(<DocExpiryAlerts />);
    expect(screen.getByText(/fleet.docs.expiredCount/i)).toBeInTheDocument();
    expect(screen.getByText(/fleet.docs.soonCount/i)).toBeInTheDocument();
  });

  it("renders an alert row per expiring document", () => {
    const trucks: Truck[] = [
      { id: "t1", plateNumber: "CT-99-XYZ", brand: "Volvo", model: "FH16", year: 2020, mileage: 100000, status: "available", itpExpiry: plusDaysISO(5), rcaExpiry: plusDaysISO(10), vignetteExpiry: plusDaysISO(120) },
    ];
    setCollection(STORAGE_KEYS.trucks, trucks);
    render(<DocExpiryAlerts />);
    expect(screen.getAllByText("CT-99-XYZ").length).toBeGreaterThanOrEqual(2);
  });

  it("alerts are sorted by urgency (most urgent first)", () => {
    const trucks: Truck[] = [
      { id: "t1", plateNumber: "AAA-FUTURE", brand: "V", model: "M", year: 2020, mileage: 0, status: "available", itpExpiry: plusDaysISO(25), rcaExpiry: plusDaysISO(120), vignetteExpiry: plusDaysISO(120) },
      { id: "t2", plateNumber: "BBB-EXPIRED", brand: "V", model: "M", year: 2020, mileage: 0, status: "available", itpExpiry: "2020-01-01", rcaExpiry: plusDaysISO(120), vignetteExpiry: plusDaysISO(120) },
    ];
    setCollection(STORAGE_KEYS.trucks, trucks);
    render(<DocExpiryAlerts />);

    const expiredEl = screen.getByText("BBB-EXPIRED");
    const futureEl = screen.getByText("AAA-FUTURE");
    expect(expiredEl.compareDocumentPosition(futureEl) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
