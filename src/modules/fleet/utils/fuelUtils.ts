import type { FuelRecord } from "@/modules/fleet/types";

export const ALERT_THRESHOLD = 35;
export const CHART_COLORS = ["#6366f1", "#f59e0b", "#10b981"];

export function getConsumption(record: FuelRecord, allRecords: FuelRecord[]): string | null {
  const truckRecords = allRecords
    .filter((r) => r.truckId === record.truckId)
    .sort((a, b) => a.mileage - b.mileage);
  const idx = truckRecords.findIndex((r) => r.id === record.id);
  if (idx === 0) return null;
  const prev = truckRecords[idx - 1];
  const kmDiff = record.mileage - prev.mileage;
  if (kmDiff <= 0) return null;
  return ((record.liters / kmDiff) * 100).toFixed(1);
}

export function buildChartData(
  records: FuelRecord[],
  trucks: { id: string; plateNumber: string }[]
): Record<string, string | number>[] {
  const result: Record<string, string | number>[] = [];
  trucks.forEach((truck) => {
    const truckRecords = [...records]
      .filter((r) => r.truckId === truck.id)
      .sort((a, b) => a.mileage - b.mileage);
    truckRecords.forEach((rec, idx) => {
      if (idx === 0) return;
      const prev = truckRecords[idx - 1];
      const kmDiff = rec.mileage - prev.mileage;
      if (kmDiff <= 0) return;
      const cons = parseFloat(((rec.liters / kmDiff) * 100).toFixed(1));
      if (!result[idx - 1]) result[idx - 1] = { index: idx };
      result[idx - 1][truck.plateNumber] = cons;
    });
  });
  return result;
}