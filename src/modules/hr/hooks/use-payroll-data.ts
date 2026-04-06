import * as React from "react";
import { STORAGE_KEYS } from "@/data/mock-data";
import { getCollection } from "@/utils/local-storage";
import type { Employee, Bonus } from "@/modules/hr/types";
import type { Driver, Trip } from "@/modules/transport/types";
import type { BonusRow } from "../components/bonus-row";
import type { PayrollRow } from "../payroll/payroll-shared";

function normalizeBonusAmount(bonus: Bonus): number {
  if (bonus.type === "amenda") {
    return -Math.abs(bonus.amount);
  }

  return Math.abs(bonus.amount);
}

function getTripDays(trip: Trip): number {
  const start = new Date(`${trip.departureDate}T00:00:00`);
  const end = new Date(`${trip.estimatedArrivalDate}T00:00:00`);
  const diffMs = end.getTime() - start.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(days, 1);
}

export function usePayrollData(selectedMonth: string) {
  const [employees, setEmployees] = React.useState<Employee[]>(() =>
    getCollection<Employee>(STORAGE_KEYS.employees),
  );
  const [drivers, setDrivers] = React.useState<Driver[]>(() =>
    getCollection<Driver>(STORAGE_KEYS.drivers),
  );
  const [trips, setTrips] = React.useState<Trip[]>(() =>
    getCollection<Trip>(STORAGE_KEYS.trips),
  );
  const [bonuses, setBonuses] = React.useState<Bonus[]>(() =>
    getCollection<Bonus>(STORAGE_KEYS.bonuses),
  );

  const refreshData = React.useCallback(() => {
    setEmployees(getCollection<Employee>(STORAGE_KEYS.employees));
    setDrivers(getCollection<Driver>(STORAGE_KEYS.drivers));
    setTrips(getCollection<Trip>(STORAGE_KEYS.trips));
    setBonuses(getCollection<Bonus>(STORAGE_KEYS.bonuses));
  }, []);

  const employeeIdByDriverId = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const driver of drivers) {
      if (driver.employeeId) {
        map.set(driver.id, driver.employeeId);
      }
    }
    return map;
  }, [drivers]);

  const monthTripsByEmployeeId = React.useMemo(() => {
    const map = new Map<string, Trip[]>();

    for (const trip of trips) {
      if (trip.status !== "finalizata") continue;
      if (!trip.estimatedArrivalDate.startsWith(selectedMonth)) continue;

      const employeeId = employeeIdByDriverId.get(trip.driverId);
      if (!employeeId) continue;

      const existing = map.get(employeeId) ?? [];
      existing.push(trip);
      map.set(employeeId, existing);
    }

    return map;
  }, [trips, selectedMonth, employeeIdByDriverId]);

  const payrollRows = React.useMemo<PayrollRow[]>(() => {
    return employees.map((emp) => {
      const empBonuses = bonuses
        .filter((b) => b.employeeId === emp.id && b.date.startsWith(selectedMonth))
        .map((b) => ({ ...b, amount: normalizeBonusAmount(b) }));

      const employeeTrips = monthTripsByEmployeeId.get(emp.id) ?? [];
      const diurna = employeeTrips.reduce(
        (sum, trip) => sum + getTripDays(trip) * 50,
        0,
      );

      const bonusuri = empBonuses
        .filter((b) => b.type === "bonus" && b.amount > 0)
        .reduce((sum, b) => sum + b.amount, 0);

      const amenzi = Math.abs(
        empBonuses
          .filter((b) => b.amount < 0)
          .reduce((sum, b) => sum + b.amount, 0),
      );

      const oreSuplimentare = empBonuses
        .filter((b) => b.type === "ore_suplimentare" && b.amount > 0)
        .reduce((sum, b) => sum + b.amount, 0);

      return {
        id: emp.id,
        name: emp.name,
        department: emp.department,
        salary: emp.salary,
        diurna,
        bonusuri,
        amenzi,
        oreSuplimentare,
        totalNet: emp.salary + diurna + bonusuri + oreSuplimentare - amenzi,
      };
    });
  }, [employees, bonuses, selectedMonth, monthTripsByEmployeeId]);

  const bonusRows = React.useMemo<BonusRow[]>(() => {
    return bonuses
      .filter((b) => b.date.startsWith(selectedMonth))
      .map((b) => ({
        ...b,
        amount: normalizeBonusAmount(b),
        employeeName: employees.find((e) => e.id === b.employeeId)?.name ?? "—",
      }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 20);
  }, [employees, bonuses, selectedMonth]);

  return {
    employees,
    payrollRows,
    bonusRows,
    refreshData,
  };
}
