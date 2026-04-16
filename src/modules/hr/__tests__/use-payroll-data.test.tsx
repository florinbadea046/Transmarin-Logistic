// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePayrollData } from "@/modules/hr/hooks/use-payroll-data";
import { STORAGE_KEYS } from "@/data/mock-data";
import { setCollection } from "@/utils/local-storage";
import type { Employee, Bonus } from "@/modules/hr/types";
import type { Driver, Trip } from "@/modules/transport/types";

const employees: Employee[] = [
  { id: "e1", name: "Ion Popescu", position: "Sofer", department: "Transport", phone: "0721000001", email: "ion@x", hireDate: "2024-01-01", salary: 5000, documents: [] },
  { id: "e2", name: "Maria Pop", position: "Dispecer", department: "Dispecerat", phone: "0721000002", email: "maria@x", hireDate: "2024-02-01", salary: 6000, documents: [] },
];

const drivers: Driver[] = [
  { id: "d1", name: "Ion Popescu", phone: "0721000001", licenseExpiry: "2027-01-01", status: "available", employeeId: "e1" },
  { id: "d-other", name: "No Link", phone: "0721000099", licenseExpiry: "2027-01-01", status: "available" },
];

describe("usePayrollData", () => {
  beforeEach(() => {
    localStorage.clear();
    setCollection(STORAGE_KEYS.employees, employees);
    setCollection(STORAGE_KEYS.drivers, drivers);
  });

  it("returns employees", () => {
    const { result } = renderHook(() => usePayrollData("2026-04"));
    expect(result.current.employees).toHaveLength(2);
  });

  it("returns one payroll row per employee", () => {
    const { result } = renderHook(() => usePayrollData("2026-04"));
    expect(result.current.payrollRows).toHaveLength(2);
  });

  it("computes diurna as 50 RON per trip-day for finalized trips", () => {
    const trips: Trip[] = [
      { id: "tr1", orderId: "o1", driverId: "d1", truckId: "t1", departureDate: "2026-04-10", estimatedArrivalDate: "2026-04-12", kmLoaded: 100, kmEmpty: 50, fuelCost: 200, status: "finalizata" },
    ];
    setCollection(STORAGE_KEYS.trips, trips);
    const { result } = renderHook(() => usePayrollData("2026-04"));
    const ionRow = result.current.payrollRows.find((r) => r.id === "e1")!;
    // 3 days (10,11,12) x 50 RON = 150
    expect(ionRow.diurna).toBe(150);
  });

  it("ignores non-finalized trips for diurna", () => {
    const trips: Trip[] = [
      { id: "tr1", orderId: "o1", driverId: "d1", truckId: "t1", departureDate: "2026-04-10", estimatedArrivalDate: "2026-04-12", kmLoaded: 100, kmEmpty: 50, fuelCost: 200, status: "in_desfasurare" },
    ];
    setCollection(STORAGE_KEYS.trips, trips);
    const { result } = renderHook(() => usePayrollData("2026-04"));
    expect(result.current.payrollRows.find((r) => r.id === "e1")?.diurna).toBe(0);
  });

  it("ignores trips outside selected month", () => {
    const trips: Trip[] = [
      { id: "tr1", orderId: "o1", driverId: "d1", truckId: "t1", departureDate: "2026-03-10", estimatedArrivalDate: "2026-03-12", kmLoaded: 100, kmEmpty: 50, fuelCost: 200, status: "finalizata" },
    ];
    setCollection(STORAGE_KEYS.trips, trips);
    const { result } = renderHook(() => usePayrollData("2026-04"));
    expect(result.current.payrollRows.find((r) => r.id === "e1")?.diurna).toBe(0);
  });

  it("ignores trips for drivers with no linked employeeId", () => {
    const trips: Trip[] = [
      { id: "tr1", orderId: "o1", driverId: "d-other", truckId: "t1", departureDate: "2026-04-10", estimatedArrivalDate: "2026-04-11", kmLoaded: 100, kmEmpty: 50, fuelCost: 200, status: "finalizata" },
    ];
    setCollection(STORAGE_KEYS.trips, trips);
    const { result } = renderHook(() => usePayrollData("2026-04"));
    expect(result.current.payrollRows.every((r) => r.diurna === 0)).toBe(true);
  });

  it("sums positive bonuses (excluding amenda)", () => {
    const bonuses: Bonus[] = [
      { id: "b1", employeeId: "e1", type: "bonus", amount: 300, date: "2026-04-15", description: "Bonus performance" },
      { id: "b2", employeeId: "e1", type: "bonus", amount: 100, date: "2026-04-20", description: "Other bonus" },
    ];
    setCollection(STORAGE_KEYS.bonuses, bonuses);
    const { result } = renderHook(() => usePayrollData("2026-04"));
    expect(result.current.payrollRows.find((r) => r.id === "e1")?.bonusuri).toBe(400);
  });

  it("sums fines as positive amenzi value (absolute)", () => {
    const bonuses: Bonus[] = [
      { id: "b1", employeeId: "e1", type: "amenda", amount: 100, date: "2026-04-15", description: "Speeding" },
      { id: "b2", employeeId: "e1", type: "amenda", amount: -50, date: "2026-04-20", description: "Late" },
    ];
    setCollection(STORAGE_KEYS.bonuses, bonuses);
    const { result } = renderHook(() => usePayrollData("2026-04"));
    expect(result.current.payrollRows.find((r) => r.id === "e1")?.amenzi).toBe(150);
  });

  it("sums overtime separately", () => {
    const bonuses: Bonus[] = [
      { id: "b1", employeeId: "e1", type: "ore_suplimentare", amount: 200, date: "2026-04-15", description: "Sat work" },
    ];
    setCollection(STORAGE_KEYS.bonuses, bonuses);
    const { result } = renderHook(() => usePayrollData("2026-04"));
    expect(result.current.payrollRows.find((r) => r.id === "e1")?.oreSuplimentare).toBe(200);
  });

  it("computes totalNet = salary + diurna + bonuses + overtime - fines", () => {
    const trips: Trip[] = [
      { id: "tr1", orderId: "o1", driverId: "d1", truckId: "t1", departureDate: "2026-04-10", estimatedArrivalDate: "2026-04-10", kmLoaded: 100, kmEmpty: 50, fuelCost: 200, status: "finalizata" },
    ];
    const bonuses: Bonus[] = [
      { id: "b1", employeeId: "e1", type: "bonus", amount: 300, date: "2026-04-15", description: "" },
      { id: "b2", employeeId: "e1", type: "amenda", amount: 100, date: "2026-04-20", description: "" },
      { id: "b3", employeeId: "e1", type: "ore_suplimentare", amount: 50, date: "2026-04-21", description: "" },
    ];
    setCollection(STORAGE_KEYS.trips, trips);
    setCollection(STORAGE_KEYS.bonuses, bonuses);
    const { result } = renderHook(() => usePayrollData("2026-04"));
    const ion = result.current.payrollRows.find((r) => r.id === "e1")!;
    // 5000 + 50 + 300 + 50 - 100 = 5300
    expect(ion.totalNet).toBe(5300);
  });

  it("bonusRows excludes bonuses outside selected month", () => {
    const bonuses: Bonus[] = [
      { id: "b1", employeeId: "e1", type: "bonus", amount: 100, date: "2026-04-15", description: "" },
      { id: "b2", employeeId: "e1", type: "bonus", amount: 200, date: "2026-03-15", description: "" },
    ];
    setCollection(STORAGE_KEYS.bonuses, bonuses);
    const { result } = renderHook(() => usePayrollData("2026-04"));
    expect(result.current.bonusRows).toHaveLength(1);
  });

  it("bonusRows resolves employee name", () => {
    const bonuses: Bonus[] = [
      { id: "b1", employeeId: "e1", type: "bonus", amount: 100, date: "2026-04-15", description: "" },
    ];
    setCollection(STORAGE_KEYS.bonuses, bonuses);
    const { result } = renderHook(() => usePayrollData("2026-04"));
    expect(result.current.bonusRows[0].employeeName).toBe("Ion Popescu");
  });

  it("refreshData re-reads collections", () => {
    const { result } = renderHook(() => usePayrollData("2026-04"));
    expect(result.current.bonusRows).toHaveLength(0);
    setCollection<Bonus>(STORAGE_KEYS.bonuses, [
      { id: "b1", employeeId: "e1", type: "bonus", amount: 100, date: "2026-04-15", description: "" },
    ]);
    act(() => result.current.refreshData());
    expect(result.current.bonusRows).toHaveLength(1);
  });
});
