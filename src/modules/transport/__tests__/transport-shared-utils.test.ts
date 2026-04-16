import { describe, it, expect } from "vitest";
import {
  stripD,
  daysUntilExpiry,
  formatDate,
} from "@/modules/transport/pages/_components/transport-shared-utils";

describe("stripD", () => {
  it("strips Romanian diacritics for ș/ț (s/t)", () => {
    expect(stripD("Constanța")).toBe("Constanta");
    expect(stripD("Iași")).toBe("Iasi");
    expect(stripD("Bucuresti")).toBe("Bucuresti");
  });

  it("legacy: returns uppercase A for ă/â/Ă/Â (existing quirk)", () => {
    expect(stripD("ă")).toBe("A");
    expect(stripD("â")).toBe("A");
    expect(stripD("Ă")).toBe("A");
  });

  it("handles uppercase Ș/Ț by converting to S/T", () => {
    expect(stripD("ȘOSEAUA")).toBe("SOSEAUA");
    expect(stripD("ȚARA")).toBe("TARA");
  });

  it("returns empty string for null and undefined", () => {
    expect(stripD(null)).toBe("");
    expect(stripD(undefined)).toBe("");
  });

  it("converts numbers and booleans to string", () => {
    expect(stripD(42)).toBe("42");
    expect(stripD(true)).toBe("true");
  });
});

describe("daysUntilExpiry", () => {
  function todayIso(): string {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  }

  function plusDaysIso(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  it("returns 0 for today's date", () => {
    expect(daysUntilExpiry(todayIso())).toBe(0);
  });

  it("returns positive days for future dates", () => {
    expect(daysUntilExpiry(plusDaysIso(10))).toBe(10);
    expect(daysUntilExpiry(plusDaysIso(30))).toBe(30);
  });

  it("returns negative days for past dates", () => {
    expect(daysUntilExpiry(plusDaysIso(-1))).toBe(-1);
    expect(daysUntilExpiry(plusDaysIso(-15))).toBe(-15);
  });
});

describe("formatDate", () => {
  it("formats ISO date to ro-RO locale", () => {
    expect(formatDate("2026-04-16")).toMatch(/16/);
    expect(formatDate("2026-04-16")).toMatch(/2026/);
  });

  it("handles different dates consistently", () => {
    const result = formatDate("2026-12-31");
    expect(result).toContain("31");
    expect(result).toContain("2026");
  });
});
