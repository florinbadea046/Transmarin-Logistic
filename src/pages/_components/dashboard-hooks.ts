import * as React from "react";
import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Order, Truck as TruckType } from "@/modules/transport/types";
import type { Employee, LeaveRequest } from "@/modules/hr/types";
import type { MaintenanceRecord } from "@/modules/transport/types";
import type { FuelLog } from "@/modules/transport/types";
import type { RawTrip } from "./dashboard-utils";

// ── Data hooks ─────────────────────────────────────────────

export function useTransportData() {
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [trips, setTrips] = React.useState<RawTrip[]>([]);
  const [trucks, setTrucks] = React.useState<TruckType[]>([]);
  const [maintenance, setMaintenance] = React.useState<MaintenanceRecord[]>([]);
  const [fuelLogs, setFuelLogs] = React.useState<FuelLog[]>([]);
  React.useEffect(() => {
    try { setOrders(getCollection<Order>(STORAGE_KEYS.orders)); } catch (e) { console.warn("Failed to load orders:", e); }
    try { setTrips(getCollection<RawTrip>(STORAGE_KEYS.trips)); } catch (e) { console.warn("Failed to load trips:", e); }
    try { setTrucks(getCollection<TruckType>(STORAGE_KEYS.trucks)); } catch (e) { console.warn("Failed to load trucks:", e); }
    try { setMaintenance(getCollection<MaintenanceRecord>(STORAGE_KEYS.maintenance)); } catch (e) { console.warn("Failed to load maintenance:", e); }
    try { setFuelLogs(getCollection<FuelLog>(STORAGE_KEYS.fuelLog)); } catch (e) { console.warn("Failed to load fuelLogs:", e); }
  }, []);
  return { orders, trips, trucks, maintenance, fuelLogs };
}

export function useHRData() {
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [leaveRequests, setLeaveRequests] = React.useState<LeaveRequest[]>([]);
  React.useEffect(() => {
    try { setEmployees(getCollection<Employee>(STORAGE_KEYS.employees)); } catch (e) { console.warn("Failed to load employees:", e); }
    try { setLeaveRequests(getCollection<LeaveRequest>(STORAGE_KEYS.leaveRequests)); } catch (e) { console.warn("Failed to load leaveRequests:", e); }
  }, []);
  return { employees, leaveRequests };
}



export function useFinancialData() {
  const invoicesRaw = localStorage.getItem("transmarin_invoices");
  const invoices = invoicesRaw ? JSON.parse(invoicesRaw) : [];
  return { invoices };
}