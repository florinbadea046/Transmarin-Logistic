import type { Truck } from "@/modules/transport/types";

export const STATUS_CLASS: Record<Truck["status"], string> = {
  available: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200",
  on_trip: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200",
  in_service: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200",
};
