import { z } from "zod";
import { getDaysInMonth, format } from "date-fns";

import type { Truck, Trip } from "@/modules/transport/types";

export const MILEAGE_KEY = "transmarin_mileage_entries";

export interface MileageEntry {
  truckId: string;
  month: string;
  kmStart: number;
  kmEnd: number;
}

export function getMileageEntries(): MileageEntry[] {
  try {
    const raw = localStorage.getItem(MILEAGE_KEY);
    return raw ? (JSON.parse(raw) as MileageEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveMileageEntries(entries: MileageEntry[]) {
  localStorage.setItem(MILEAGE_KEY, JSON.stringify(entries));
}

export function upsertEntry(entry: MileageEntry) {
  const all = getMileageEntries();
  const idx = all.findIndex(
    (e) => e.truckId === entry.truckId && e.month === entry.month,
  );
  if (idx >= 0) all[idx] = entry;
  else all.push(entry);
  saveMileageEntries(all);
}

export interface RowData {
  truck: Truck;
  kmStart: number;
  kmEnd: number;
  kmDriven: number;
  kmTrips: number;
  avgPerDay: number;
  discrepancyPct: number;
  hasAlert: boolean;
}

export function buildRows(
  trucks: Truck[],
  trips: Trip[],
  month: string,
  entries: MileageEntry[],
): RowData[] {
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = getDaysInMonth(new Date(y, m - 1));
  const pad = (n: number) => String(n).padStart(2, "0");
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-${pad(daysInMonth)}`;

  return trucks.map((truck) => {
    const entry = entries.find(
      (e) => e.truckId === truck.id && e.month === month,
    );
    const kmStart = entry?.kmStart ?? truck.mileage;
    const kmEnd = entry?.kmEnd ?? truck.mileage;
    const kmDriven = Math.max(0, kmEnd - kmStart);

    const kmTrips = trips
      .filter(
        (t) =>
          t.truckId === truck.id &&
          t.departureDate >= monthStart &&
          t.departureDate <= monthEnd,
      )
      .reduce((s, t) => s + (t.kmLoaded || 0) + (t.kmEmpty || 0), 0);

    const avgPerDay = daysInMonth > 0 ? Math.round(kmDriven / daysInMonth) : 0;
    const discrepancyPct =
      kmDriven > 0 ? Math.abs(kmDriven - kmTrips) / kmDriven : 0;
    const hasAlert = discrepancyPct > 0.1 && (kmDriven > 0 || kmTrips > 0);

    return {
      truck,
      kmStart,
      kmEnd,
      kmDriven,
      kmTrips,
      avgPerDay,
      discrepancyPct,
      hasAlert,
    };
  });
}

export const LINE_COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
];

export function buildChartData(
  trucks: Truck[],
  entries: MileageEntry[],
): { month: string; [plate: string]: number | string }[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(format(d, "yyyy-MM"));
  }
  return months.map((mo) => {
    const row: { month: string; [k: string]: number | string } = {
      month: mo.slice(5),
    };
    trucks.forEach((truck) => {
      const e = entries.find((x) => x.truckId === truck.id && x.month === mo);
      row[truck.plateNumber] = e ? Math.max(0, e.kmEnd - e.kmStart) : 0;
    });
    return row;
  });
}

export const entrySchema = z.object({
  kmStart: z.coerce.number().min(0, "mileageRegistry.validation.kmStartMin"),
  kmEnd: z.coerce.number().min(0, "mileageRegistry.validation.kmEndMin"),
});
