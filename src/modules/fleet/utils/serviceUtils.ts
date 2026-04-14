import type { ServiceRecord, Part } from "@/modules/fleet/types";

export function getTypeLabels(
  t: (k: string) => string,
): Record<ServiceRecord["type"], string> {
  return {
    revision: t("fleet.service.typeRevision"),
    repair: t("fleet.service.typeRepair"),
    itp: t("fleet.service.typeItp"),
    other: t("fleet.service.typeOther"),
  };
}

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
  const priceById = new Map<string, number>();
  for (const part of parts) {
    priceById.set(part.id, part.unitPrice ?? 0);
  }

  return partsUsed.reduce(
    (sum, pu) => sum + (priceById.get(pu.partId) ?? 0) * pu.quantity,
    0
  );
}
