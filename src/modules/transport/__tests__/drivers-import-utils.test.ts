import { describe, it, expect } from "vitest";
import {
  PHONE_RO_REGEX,
  DRIVER_COL_MAP,
  normalizeDate,
  parseDriverRows,
} from "@/modules/transport/pages/_components/drivers-import-utils";
import type { Driver } from "@/modules/transport/types";

const t = (k: string) => k;

describe("PHONE_RO_REGEX", () => {
  it("accepts valid Romanian mobile numbers", () => {
    expect(PHONE_RO_REGEX.test("0721234567")).toBe(true);
    expect(PHONE_RO_REGEX.test("0700000000")).toBe(true);
    expect(PHONE_RO_REGEX.test("0799999999")).toBe(true);
  });

  it("rejects invalid formats", () => {
    expect(PHONE_RO_REGEX.test("0721 234 567")).toBe(false);
    expect(PHONE_RO_REGEX.test("+40721234567")).toBe(false);
    expect(PHONE_RO_REGEX.test("0821234567")).toBe(false);
    expect(PHONE_RO_REGEX.test("072123456")).toBe(false);
    expect(PHONE_RO_REGEX.test("")).toBe(false);
  });
});

describe("normalizeDate", () => {
  it("returns ISO format unchanged", () => {
    expect(normalizeDate("2026-04-16")).toBe("2026-04-16");
  });

  it("converts dd/MM/yyyy to ISO", () => {
    expect(normalizeDate("16/04/2026")).toBe("2026-04-16");
    expect(normalizeDate("1/4/2026")).toBe("2026-04-01");
  });

  it("converts dd.MM.yyyy to ISO", () => {
    expect(normalizeDate("16.04.2026")).toBe("2026-04-16");
  });

  it("returns input unchanged for unrecognized format", () => {
    expect(normalizeDate("invalid")).toBe("invalid");
  });

  it("trims whitespace", () => {
    expect(normalizeDate("  2026-04-16  ")).toBe("2026-04-16");
  });
});

describe("DRIVER_COL_MAP", () => {
  it("maps Romanian and English column headers", () => {
    expect(DRIVER_COL_MAP["nume"]).toBe("name");
    expect(DRIVER_COL_MAP["name"]).toBe("name");
    expect(DRIVER_COL_MAP["telefon"]).toBe("phone");
    expect(DRIVER_COL_MAP["expirare permis"]).toBe("licenseExpiry");
    expect(DRIVER_COL_MAP["status"]).toBe("status");
  });
});

describe("parseDriverRows", () => {
  const existing: Driver[] = [
    {
      id: "d1",
      name: "Existing Driver",
      phone: "0700000000",
      licenseExpiry: "2027-01-01",
      status: "available",
    },
  ];

  it("parses valid rows with no errors", () => {
    const rows = [
      { Nume: "Ion Popescu", Telefon: "0721234567", "Exp. permis": "2027-05-15" },
    ];
    const parsed = parseDriverRows(rows, [], t);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].errors).toHaveLength(0);
    expect(parsed[0].mapped.name).toBe("Ion Popescu");
    expect(parsed[0].mapped.phone).toBe("0721234567");
    expect(parsed[0].mapped.licenseExpiry).toBe("2027-05-15");
    expect(parsed[0].mapped.status).toBe("available");
  });

  it("flags rows with invalid phone", () => {
    const rows = [
      { Nume: "Ion", Telefon: "INVALID", "Exp. permis": "2027-05-15" },
    ];
    const parsed = parseDriverRows(rows, [], t);
    expect(parsed[0].errors).toContain("drivers.import.errorPhone");
  });

  it("flags rows with missing/short name", () => {
    const rows = [
      { Nume: "X", Telefon: "0721234567", "Exp. permis": "2027-05-15" },
    ];
    const parsed = parseDriverRows(rows, [], t);
    expect(parsed[0].errors).toContain("drivers.import.errorName");
  });

  it("flags rows with invalid date", () => {
    const rows = [
      { Nume: "Ion Popescu", Telefon: "0721234567", "Exp. permis": "not-a-date" },
    ];
    const parsed = parseDriverRows(rows, [], t);
    expect(parsed[0].errors).toContain("drivers.import.errorDate");
  });

  it("normalizes date formats during parse", () => {
    const rows = [
      { Nume: "Ion Popescu", Telefon: "0721234567", "Exp. permis": "15/05/2027" },
    ];
    const parsed = parseDriverRows(rows, [], t);
    expect(parsed[0].errors).toHaveLength(0);
    expect(parsed[0].mapped.licenseExpiry).toBe("2027-05-15");
  });

  it("detects duplicates by name (case-insensitive)", () => {
    const rows = [
      { Nume: "EXISTING DRIVER", Telefon: "0721111111", "Exp. permis": "2027-05-15" },
    ];
    const parsed = parseDriverRows(rows, existing, t);
    expect(parsed[0].isDuplicate).toBe(true);
  });

  it("detects duplicates by phone", () => {
    const rows = [
      { Nume: "Different Name", Telefon: "0700000000", "Exp. permis": "2027-05-15" },
    ];
    const parsed = parseDriverRows(rows, existing, t);
    expect(parsed[0].isDuplicate).toBe(true);
  });

  it("maps Romanian status labels to internal keys", () => {
    const rows = [
      { Nume: "Ion Popescu", Telefon: "0721234567", "Exp. permis": "2027-05-15", Status: "in cursa" },
    ];
    const parsed = parseDriverRows(rows, [], t);
    expect(parsed[0].mapped.status).toBe("on_trip");
  });

  it("defaults to 'available' for unknown status", () => {
    const rows = [
      { Nume: "Ion Popescu", Telefon: "0721234567", "Exp. permis": "2027-05-15", Status: "??" },
    ];
    const parsed = parseDriverRows(rows, [], t);
    expect(parsed[0].mapped.status).toBe("available");
  });

  it("returns rowIndex starting at 1 for human-readable errors", () => {
    const rows = [
      { Nume: "Ion", Telefon: "0721234567", "Exp. permis": "2027-05-15" },
      { Nume: "Maria Pop", Telefon: "0721234568", "Exp. permis": "2027-06-15" },
    ];
    const parsed = parseDriverRows(rows, [], t);
    expect(parsed[0].rowIndex).toBe(1);
    expect(parsed[1].rowIndex).toBe(2);
  });
});
