import type { Truck } from "@/modules/transport/types";

export const STATUS_CONFIG: Record<
  Truck["status"],
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  available: { label: "Disponibil", variant: "default" },
  on_trip: { label: "În cursă", variant: "secondary" },
  in_service: { label: "În service", variant: "destructive" },
};

export const isExpired = (dateStr: string): boolean =>
  new Date(dateStr).getTime() < Date.now();

export const isExpiringSoon = (
  dateStr: string,
  days = 30
): boolean => {
  const diff = new Date(dateStr).getTime() - Date.now();
  return diff > 0 && diff < days * 24 * 60 * 60 * 1000;
};

export const getDateStatus = (dateStr: string) => {
  if (isExpired(dateStr)) return "expired";
  if (isExpiringSoon(dateStr)) return "soon";
  return "valid";
};