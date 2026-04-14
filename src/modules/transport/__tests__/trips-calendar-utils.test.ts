// ──────────────────────────────────────────────────────────
// Unit tests: Calendar utility functions
// File: src/modules/transport/pages/_components/trips-calendar-utils.ts
//
// Ce trebuie testat:
// - padTwo(5) => "05", padTwo(12) => "12"
// - toYMD(new Date(2026, 0, 15)) => "2026-01-15"
// - startOfMonth(2026, 3) => prima zi din aprilie 2026
// - getDaysInMonth(2026, 1) => 28 (nu e bisect)
// - getDayOfWeek() => 0=Luni, 6=Duminica
// - addDays() => adauga N zile corect, trece luna
// ──────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import {
  padTwo,
  toYMD,
  startOfMonth,
  getDaysInMonth,
  getDayOfWeek,
  addDays,
} from "../pages/_components/trips-calendar-utils";

// ─── padTwo ────────────────────────────────────────────────
describe("padTwo", () => {
  it("adauga zero in fata pentru numere sub 10", () => {
    expect(padTwo(1)).toBe("01");
    expect(padTwo(5)).toBe("05");
    expect(padTwo(9)).toBe("09");
  });

  it("nu adauga zero pentru numere >= 10", () => {
    expect(padTwo(10)).toBe("10");
    expect(padTwo(12)).toBe("12");
    expect(padTwo(31)).toBe("31");
  });

  it("returneaza 00 pentru 0", () => {
    expect(padTwo(0)).toBe("00");
  });
});

// ─── toYMD ─────────────────────────────────────────────────
describe("toYMD", () => {
  it("formateaza data la yyyy-MM-dd", () => {
    expect(toYMD(new Date(2026, 0, 15))).toBe("2026-01-15");
  });

  it("adauga zero in fata pentru luna si zi sub 10", () => {
    expect(toYMD(new Date(2026, 0, 1))).toBe("2026-01-01");
    expect(toYMD(new Date(2026, 2, 9))).toBe("2026-03-09");
  });

  it("formateaza luna decembrie corect", () => {
    expect(toYMD(new Date(2026, 11, 31))).toBe("2026-12-31");
  });

  it("formateaza luna si zi cu doua cifre corect", () => {
    expect(toYMD(new Date(2026, 9, 25))).toBe("2026-10-25");
  });
});

// ─── startOfMonth ──────────────────────────────────────────
describe("startOfMonth", () => {
  it("returneaza ziua 1 a lunii", () => {
    const result = startOfMonth(new Date(2026, 3, 15));
    expect(result.getDate()).toBe(1);
    expect(result.getMonth()).toBe(3);
    expect(result.getFullYear()).toBe(2026);
  });

  it("functioneaza si cand data e deja prima zi", () => {
    const result = startOfMonth(new Date(2026, 0, 1));
    expect(result.getDate()).toBe(1);
    expect(result.getMonth()).toBe(0);
  });

  it("functioneaza pentru ultima luna a anului", () => {
    const result = startOfMonth(new Date(2026, 11, 25));
    expect(result.getDate()).toBe(1);
    expect(result.getMonth()).toBe(11);
    expect(result.getFullYear()).toBe(2026);
  });
});

// ─── getDaysInMonth ────────────────────────────────────────
describe("getDaysInMonth", () => {
  it("returneaza 31 pentru ianuarie", () => {
    expect(getDaysInMonth(2026, 0)).toBe(31);
  });

  it("returneaza 28 pentru februarie an ne-bisect", () => {
    expect(getDaysInMonth(2026, 1)).toBe(28);
  });

  it("returneaza 29 pentru februarie an bisect", () => {
    expect(getDaysInMonth(2024, 1)).toBe(29);
  });

  it("returneaza 30 pentru aprilie", () => {
    expect(getDaysInMonth(2026, 3)).toBe(30);
  });

  it("returneaza 31 pentru iulie", () => {
    expect(getDaysInMonth(2026, 6)).toBe(31);
  });

  it("returneaza 30 pentru noiembrie", () => {
    expect(getDaysInMonth(2026, 10)).toBe(30);
  });

  it("returneaza 31 pentru decembrie", () => {
    expect(getDaysInMonth(2026, 11)).toBe(31);
  });
});

// ─── getDayOfWeek ──────────────────────────────────────────
describe("getDayOfWeek — saptamana incepe luni (0=luni, 6=duminica)", () => {
  it("luni returneaza 0", () => {
    const monday = new Date(2026, 0, 5);
    expect(getDayOfWeek(monday)).toBe(0);
  });

  it("marti returneaza 1", () => {
    const tuesday = new Date(2026, 0, 6);
    expect(getDayOfWeek(tuesday)).toBe(1);
  });

  it("miercuri returneaza 2", () => {
    const wednesday = new Date(2026, 0, 7);
    expect(getDayOfWeek(wednesday)).toBe(2);
  });

  it("joi returneaza 3", () => {
    const thursday = new Date(2026, 0, 8);
    expect(getDayOfWeek(thursday)).toBe(3);
  });

  it("vineri returneaza 4", () => {
    const friday = new Date(2026, 0, 9);
    expect(getDayOfWeek(friday)).toBe(4);
  });

  it("sambata returneaza 5", () => {
    const saturday = new Date(2026, 0, 10);
    expect(getDayOfWeek(saturday)).toBe(5);
  });

  it("duminica returneaza 6", () => {
    const sunday = new Date(2026, 0, 11);
    expect(getDayOfWeek(sunday)).toBe(6);
  });
});

// ─── addDays ───────────────────────────────────────────────
describe("addDays", () => {
  it("adauga zile pozitive corect", () => {
    const d = new Date(2026, 0, 1);
    const result = addDays(d, 5);
    expect(result.getDate()).toBe(6);
    expect(result.getMonth()).toBe(0);
  });

  it("traverseaza sfarsitul de luna corect", () => {
    const d = new Date(2026, 0, 28);
    const result = addDays(d, 5);
    expect(result.getDate()).toBe(2);
    expect(result.getMonth()).toBe(1);
  });

  it("traverseaza sfarsitul de an corect", () => {
    const d = new Date(2025, 11, 30);
    const result = addDays(d, 3);
    expect(result.getDate()).toBe(2);
    expect(result.getMonth()).toBe(0);
    expect(result.getFullYear()).toBe(2026);
  });

  it("adauga zile negative merge inapoi", () => {
    const d = new Date(2026, 0, 10);
    const result = addDays(d, -3);
    expect(result.getDate()).toBe(7);
    expect(result.getMonth()).toBe(0);
  });

  it("adauga 0 zile returneaza aceeasi data", () => {
    const d = new Date(2026, 5, 15);
    const result = addDays(d, 0);
    expect(result.getDate()).toBe(15);
    expect(result.getMonth()).toBe(5);
  });

  it("nu modifica data originala", () => {
    const d = new Date(2026, 0, 10);
    addDays(d, 5);
    expect(d.getDate()).toBe(10);
  });

  it("traverseaza luna februarie an bisect corect", () => {
    const d = new Date(2024, 1, 28);
    const result = addDays(d, 1);
    expect(result.getDate()).toBe(29);
    expect(result.getMonth()).toBe(1);
  });

  it("traverseaza luna februarie an ne-bisect corect", () => {
    const d = new Date(2026, 1, 28);
    const result = addDays(d, 1);
    expect(result.getDate()).toBe(1);
    expect(result.getMonth()).toBe(2);
  });
});
