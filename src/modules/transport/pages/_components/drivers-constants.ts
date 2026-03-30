import type { Driver } from "@/modules/transport/types";

export const DRIVER_STATUS_CLASS: Record<Driver["status"], string> = {
  available: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200",
  on_trip: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200",
  off_duty: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400",
};

// ── Types formular ─────────────────────────────────────────

export interface DriverFormData {
  name: string; phone: string; licenseExpiry: string;
  status: Driver["status"]; truckId: string; employeeId?: string;
}
export interface DriverFormErrors { name?: string; phone?: string; licenseExpiry?: string; }

export const EMPTY_FORM: DriverFormData = {
  name: "", phone: "", licenseExpiry: "", status: "available", truckId: "", employeeId: "",
};
