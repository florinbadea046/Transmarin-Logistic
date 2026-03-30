import type { Trip, Order, Driver, Truck } from "@/modules/transport/types";

export const STATUS_BADGE: Record<Trip["status"], string> = {
  planned:
    "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
  in_desfasurare:
    "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400",
  finalizata:
    "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400",
  anulata:
    "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400",
};

export const STATUS_DOT: Record<Trip["status"], string> = {
  planned: "bg-blue-500",
  in_desfasurare: "bg-amber-500",
  finalizata: "bg-green-500",
  anulata: "bg-red-500",
};

export type TripWithRelations = Trip & {
  order?: Order;
  driver?: Driver;
  truck?: Truck;
};
