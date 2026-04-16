import { describe, it, expect } from "vitest";
import {
  formatDate,
  formatDateTime,
  formatCurrency,
  formatNumber,
  formatKm,
} from "@/utils/format";

describe("formatDate", () => {
  it("formats ISO date in Romanian short month", () => {
    const out = formatDate("2026-02-21");
    expect(out).toContain("21");
    expect(out).toContain("2026");
    expect(out.toLowerCase()).toContain("feb");
  });

  it("returns input unchanged on parse failure", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date");
  });
});

describe("formatDateTime", () => {
  it("includes time HH:mm", () => {
    const out = formatDateTime("2026-02-21T14:30:00");
    expect(out).toContain("14:30");
  });

  it("returns input unchanged on parse failure", () => {
    expect(formatDateTime("garbage")).toBe("garbage");
  });
});

describe("formatCurrency", () => {
  it("formats with RON suffix", () => {
    const out = formatCurrency(1234.56);
    expect(out).toMatch(/RON/i);
  });

  it("uses 2 decimal places", () => {
    const out = formatCurrency(10);
    expect(out).toMatch(/10[,.]00/);
  });
});

describe("formatNumber", () => {
  it("uses Romanian thousands separator", () => {
    expect(formatNumber(1234)).toContain("1");
    expect(formatNumber(1234567).length).toBeGreaterThan(7);
  });

  it("handles zero", () => {
    expect(formatNumber(0)).toBe("0");
  });
});

describe("formatKm", () => {
  it("appends 'km' suffix", () => {
    expect(formatKm(1500)).toMatch(/km$/);
    expect(formatKm(1500)).toContain("1");
  });
});
