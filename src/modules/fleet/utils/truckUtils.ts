import type { Truck } from "@/modules/transport/types";

export function getStatusConfig(
  t: (k: string) => string,
): Record<
  Truck["status"],
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> {
  return {
    available: { label: t("fleet.trucks.statusAvailable"), variant: "default" },
    on_trip: { label: t("fleet.trucks.statusOnTrip"), variant: "secondary" },
    in_service: { label: t("fleet.trucks.statusInService"), variant: "destructive" },
  };
}

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
