import type { FuelRecord } from "@/modules/fleet/types";

export const ALERT_THRESHOLD = 35;
export const CHART_COLORS = ["#6366f1", "#f59e0b", "#10b981"];

export function buildTruckRecordsMap(records: FuelRecord[]): Record<string, FuelRecord[]> {
  const map: Record<string, FuelRecord[]> = {};
  records.forEach((rec) => {
    if (!map[rec.truckId]) map[rec.truckId] = [];
    map[rec.truckId].push(rec);
  });
  Object.values(map).forEach((arr) => arr.sort((a, b) => a.mileage - b.mileage));
  return map;
}

export function getConsumption(record: FuelRecord, truckRecords: FuelRecord[]): string | null {
  const idx = truckRecords.findIndex((r) => r.id === record.id);
  if (idx <= 0) return null;
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
  const truckMap = buildTruckRecordsMap(records);

  trucks.forEach((truck) => {
    const truckRecords = truckMap[truck.id] || [];
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