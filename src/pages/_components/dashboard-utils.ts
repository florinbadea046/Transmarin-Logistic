// ── Types ──────────────────────────────────────────────────

export type RawTrip = {
  id: string; orderId: string; driverId: string; truckId: string;
  date?: string; departureDate?: string;
  kmLoaded: number; kmEmpty: number; fuelCost: number;
  revenue?: number; status: string;
};

// ── Helpers ────────────────────────────────────────────────

export function getTripDate(t: RawTrip): string {
  return t.departureDate || t.date || "";
}

export function padTwo(n: number): string {
  return n < 10 ? "0" + n : String(n);
}

export function toYMD(d: Date): string {
  return `${d.getFullYear()}-${padTwo(d.getMonth() + 1)}-${padTwo(d.getDate())}`;
}

export function buildLast30Days(): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    days.push(toYMD(d));
  }
  return days;
}

export function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(`${dateStr}T00:00:00`).getTime() - today.getTime()) / 86400000);
}

export function formatDateRO(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("ro-RO");
}
