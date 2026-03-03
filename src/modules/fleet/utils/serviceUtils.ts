import type { ServiceRecord, Part } from "@/modules/fleet/types";

export const TYPE_LABELS: Record<ServiceRecord["type"], string> = {
  revision: "Revizie",
  repair:   "Reparație",
  itp:      "ITP",
  other:    "Altele",
};

export function getPartName(parts: Part[], id: string): string {
  return parts.find((p) => p.id === id)?.name ?? id;
}

export function getPartPrice(parts: Part[], id: string): number {
  return parts.find((p) => p.id === id)?.unitPrice ?? 0;
}

export function calculateTotalCost(
  partsUsed: { partId: string; quantity: number }[],
  parts: Part[]
): number {
  return partsUsed.reduce((sum, pu) => sum + getPartPrice(parts, pu.partId) * pu.quantity, 0);
}