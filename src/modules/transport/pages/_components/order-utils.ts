import type { Order } from "@/modules/transport/types";
import { STORAGE_KEYS } from "@/data/mock-data";

export type StatusMeta = Record<
  Order["status"],
  {
    label: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  }
>;

export function getStatusMeta(t: (k: string) => string): StatusMeta {
  return {
    pending: { label: t("orders.status.pending"), variant: "secondary" },
    assigned: { label: t("orders.status.assigned"), variant: "outline" },
    in_transit: { label: t("orders.status.in_transit"), variant: "default" },
    delivered: { label: t("orders.status.delivered"), variant: "secondary" },
    cancelled: { label: t("orders.status.cancelled"), variant: "destructive" },
  };
}

export function safeRandomId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `order_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function setOrdersToStorage(orders: Order[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(orders));
  } catch (e) {
    console.warn("Failed to save orders:", e);
  }
}

function norm(s: string) {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function isDuplicateOrder(
  existing: Order,
  incoming: {
    clientName: string;
    origin: string;
    destination: string;
    date: string;
    weight: number;
  },
  excludeId?: string,
) {
  if (excludeId && existing.id === excludeId) return false;
  return (
    norm(String(existing.clientName ?? "")) === norm(incoming.clientName) &&
    norm(String(existing.origin ?? "")) === norm(incoming.origin) &&
    norm(String(existing.destination ?? "")) === norm(incoming.destination) &&
    String(existing.date ?? "") === incoming.date &&
    round2(Number(existing.weight ?? 0)) === round2(incoming.weight)
  );
}
