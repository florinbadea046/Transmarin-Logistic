import { describe, it, expect } from "vitest";
import {
  PLATE_REGEX,
  TRUCK_COL_MAP,
  TRUCK_STATUS_MAP,
  parseTruckRows,
} from "@/modules/transport/pages/_components/trucks-import-utils";
import type { Truck } from "@/modules/transport/types";

const t = (k: string) => k;

describe("PLATE_REGEX", () => {
  it("accepts valid Romanian plate formats", () => {
    expect(PLATE_REGEX.test("CT-01-TML")).toBe(true);
    expect(PLATE_REGEX.test("B-123-ABC")).toBe(true);
    expect(PLATE_REGEX.test("IF-99-XYZ")).toBe(true);
  });

  it("rejects invalid formats", () => {
    expect(PLATE_REGEX.test("ct-01-tml")).toBe(false);
    expect(PLATE_REGEX.test("CTT-01-TML")).toBe(false);
    expect(PLATE_REGEX.test("CT 01 TML")).toBe(false);
    expect(PLATE_REGEX.test("")).toBe(false);
  });
});

describe("TRUCK_COL_MAP", () => {
  it("maps various column names to internal keys", () => {
    expect(TRUCK_COL_MAP["plate"]).toBe("plateNumber");
    expect(TRUCK_COL_MAP["camion"]).toBe("plateNumber");
    expect(TRUCK_COL_MAP["nr. inmatriculare"]).toBe("plateNumber");
    expect(TRUCK_COL_MAP["marca"]).toBe("brand");
    expect(TRUCK_COL_MAP["an"]).toBe("year");
    expect(TRUCK_COL_MAP["km"]).toBe("mileage");
  });
});

describe("TRUCK_STATUS_MAP", () => {
  it("maps Romanian statuses to internal keys", () => {
    expect(TRUCK_STATUS_MAP["disponibil"]).toBe("available");
    expect(TRUCK_STATUS_MAP["in cursa"]).toBe("on_trip");
    expect(TRUCK_STATUS_MAP["in service"]).toBe("in_service");
  });

  it("maps English statuses too", () => {
    expect(TRUCK_STATUS_MAP["available"]).toBe("available");
    expect(TRUCK_STATUS_MAP["on trip"]).toBe("on_trip");
  });
});

describe("parseTruckRows", () => {
  const existing: Truck[] = [
    {
      id: "t1",
      plateNumber: "CT-01-TML",
      brand: "Volvo",
      model: "FH16",
      year: 2020,
      mileage: 100000,
      status: "available",
      itpExpiry: "2026-12-01",
      rcaExpiry: "2026-11-01",
      vignetteExpiry: "2026-10-01",
    },
  ];

  it("parses valid rows with no errors", () => {
    const rows = [
      {
        Plate: "CT-99-NEW",
        Marca: "MAN",
        Model: "TGX",
        An: "2022",
        Km: "50000",
        ITP: "2027-01-01",
        RCA: "2027-02-01",
        Vigneta: "2027-03-01",
      },
    ];
    const parsed = parseTruckRows(rows, [], t);
    expect(parsed[0].errors).toHaveLength(0);
    expect(parsed[0].mapped.plateNumber).toBe("CT-99-NEW");
    expect(parsed[0].mapped.year).toBe(2022);
    expect(parsed[0].mapped.mileage).toBe(50000);
  });

  it("uppercases plate number", () => {
    const rows = [
      {
        Plate: "ct-99-new",
        Marca: "MAN",
        Model: "TGX",
        An: "2022",
        ITP: "2027-01-01",
        RCA: "2027-02-01",
        Vigneta: "2027-03-01",
      },
    ];
    const parsed = parseTruckRows(rows, [], t);
    expect(parsed[0].mapped.plateNumber).toBe("CT-99-NEW");
    expect(parsed[0].errors).toHaveLength(0);
  });

  it("flags invalid plate format", () => {
    const rows = [
      {
        Plate: "INVALID",
        Marca: "MAN",
        Model: "TGX",
        An: "2022",
        ITP: "2027-01-01",
        RCA: "2027-02-01",
        Vigneta: "2027-03-01",
      },
    ];
    const parsed = parseTruckRows(rows, [], t);
    expect(parsed[0].errors).toContain("trucks.import.errorPlate");
  });

  it("flags year out of range", () => {
    const rows = [
      {
        Plate: "CT-99-NEW",
        Marca: "MAN",
        Model: "TGX",
        An: "1989",
        ITP: "2027-01-01",
        RCA: "2027-02-01",
        Vigneta: "2027-03-01",
      },
    ];
    const parsed = parseTruckRows(rows, [], t);
    expect(parsed[0].errors).toContain("trucks.import.errorYear");
  });

  it("flags missing brand", () => {
    const rows = [
      {
        Plate: "CT-99-NEW",
        Model: "TGX",
        An: "2022",
        ITP: "2027-01-01",
        RCA: "2027-02-01",
        Vigneta: "2027-03-01",
      },
    ];
    const parsed = parseTruckRows(rows, [], t);
    expect(parsed[0].errors).toContain("trucks.import.errorBrand");
  });

  it("flags invalid expiry dates", () => {
    const rows = [
      {
        Plate: "CT-99-NEW",
        Marca: "MAN",
        Model: "TGX",
        An: "2022",
        ITP: "01/01/2027",
        RCA: "INVALID",
        Vigneta: "",
      },
    ];
    const parsed = parseTruckRows(rows, [], t);
    expect(parsed[0].errors).toContain("trucks.import.errorItp");
    expect(parsed[0].errors).toContain("trucks.import.errorRca");
    expect(parsed[0].errors).toContain("trucks.import.errorVignette");
  });

  it("detects duplicates by plate (case-insensitive)", () => {
    const rows = [
      {
        Plate: "ct-01-tml",
        Marca: "MAN",
        Model: "TGX",
        An: "2022",
        ITP: "2027-01-01",
        RCA: "2027-02-01",
        Vigneta: "2027-03-01",
      },
    ];
    const parsed = parseTruckRows(rows, existing, t);
    expect(parsed[0].isDuplicate).toBe(true);
  });
});
