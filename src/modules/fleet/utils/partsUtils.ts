import type { Part } from "@/modules/fleet/types";

export function savePart(parts: Part[], form: Omit<Part, "id">, editingPart: Part | null): Part[] {
  if (editingPart) {
    return parts.map((p) => (p.id === editingPart.id ? { ...editingPart, ...form } : p));
  }
  return [...parts, { id: crypto.randomUUID(), ...form }];
}

export function deletePart(parts: Part[], id: string): Part[] {
  return parts.filter((p) => p.id !== id);
}

export function isLowStock(part: Part): boolean {
  return part.quantity < part.minStock;
}