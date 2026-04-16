import { describe, it, expect } from "vitest";
import {
  BONUS_TYPE_KEYS,
  BONUS_TYPE_LABELS,
  getMonthOptions,
  currentMonth,
} from "@/modules/hr/payroll/payroll-shared";

describe("BONUS_TYPE_KEYS", () => {
  it("maps all bonus types to i18n keys", () => {
    expect(BONUS_TYPE_KEYS.diurna).toBe("hr.payroll.typeDiurna");
    expect(BONUS_TYPE_KEYS.bonus).toBe("hr.payroll.typeBonus");
    expect(BONUS_TYPE_KEYS.amenda).toBe("hr.payroll.typeFine");
    expect(BONUS_TYPE_KEYS.ore_suplimentare).toBe("hr.payroll.typeOvertime");
  });
});

describe("BONUS_TYPE_LABELS (deprecated, kept for back-compat)", () => {
  it("provides Romanian labels", () => {
    expect(BONUS_TYPE_LABELS.diurna).toBe("Diurnă");
    expect(BONUS_TYPE_LABELS.amenda).toBe("Amendă");
  });
});

describe("currentMonth", () => {
  it("returns yyyy-MM for current month", () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    expect(currentMonth()).toBe(expected);
  });
});

describe("getMonthOptions", () => {
  it("returns 12 months", () => {
    const options = getMonthOptions("ro-RO");
    expect(options).toHaveLength(12);
  });

  it("first option is current month", () => {
    const options = getMonthOptions("ro-RO");
    expect(options[0].value).toBe(currentMonth());
  });

  it("values are in yyyy-MM format", () => {
    const options = getMonthOptions("ro-RO");
    options.forEach((o) => {
      expect(o.value).toMatch(/^\d{4}-\d{2}$/);
    });
  });

  it("labels are localized strings", () => {
    const options = getMonthOptions("en-GB");
    expect(options[0].label).toMatch(/\d{4}/);
    expect(typeof options[0].label).toBe("string");
  });

  it("months are in descending order (most recent first)", () => {
    const options = getMonthOptions("ro-RO");
    for (let i = 0; i < options.length - 1; i++) {
      expect(options[i].value > options[i + 1].value).toBe(true);
    }
  });
});
