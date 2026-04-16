// ──────────────────────────────────────────────────────────
// Unit tests: HR settings utility
// File: src/modules/hr/utils/get-hr-settings.ts
// ──────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from "vitest";
import { getHRSettings } from "@/modules/hr/utils/get-hr-settings";
import { STORAGE_KEYS } from "@/data/mock-data";

describe("getHRSettings", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns default settings when localStorage is empty", () => {
    const s = getHRSettings();
    expect(s.defaultLeaveDays).toBe(21);
    expect(s.documentAlertDays).toBe(30);
    expect(s.bonusCurrency).toBe("RON");
  });

  it("returns 5 default departments", () => {
    const s = getHRSettings();
    expect(s.departments).toEqual([
      "Dispecerat",
      "Transport",
      "Service",
      "Contabilitate",
      "Administrativ",
    ]);
  });

  it("returns 4 default leave types", () => {
    const s = getHRSettings();
    expect(s.leaveTypes).toHaveLength(4);
    expect(s.leaveTypes).toContain("Concediu de odihnă");
    expect(s.leaveTypes).toContain("Medical");
  });

  it("uses default document number format", () => {
    expect(getHRSettings().documentNumberFormat).toBe("DOC-{YYYY}-{NNN}");
  });

  it("merges saved settings on top of defaults (partial override)", () => {
    localStorage.setItem(
      STORAGE_KEYS.hr_settings,
      JSON.stringify({ defaultLeaveDays: 30, bonusCurrency: "EUR" }),
    );
    const s = getHRSettings();
    expect(s.defaultLeaveDays).toBe(30);
    expect(s.bonusCurrency).toBe("EUR");
    expect(s.departments).toHaveLength(5); // defaults preserved
  });

  it("returns full settings when fully customized in storage", () => {
    const custom = {
      defaultLeaveDays: 25,
      leaveTypes: ["Custom"],
      documentAlertDays: 15,
      departments: ["A", "B"],
      documentNumberFormat: "X-{NNN}",
      bonusCurrency: "EUR" as const,
    };
    localStorage.setItem(STORAGE_KEYS.hr_settings, JSON.stringify(custom));
    const s = getHRSettings();
    expect(s).toEqual(custom);
  });

  it("returns defaults on malformed JSON", () => {
    localStorage.setItem(STORAGE_KEYS.hr_settings, "not-json");
    expect(getHRSettings().defaultLeaveDays).toBe(21);
  });
});
