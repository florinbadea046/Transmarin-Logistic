import type { Truck } from "@/modules/transport/types";

// ── Import Camioane ────────────────────────────────────────

export const PLATE_REGEX = /^[A-Z]{1,2}-\d{2,3}-[A-Z]{2,3}$/;

export const TRUCK_COL_MAP: Record<string, string> = {
  // Numar inmatriculare
  "numar inmatriculare": "plateNumber", "platenumber": "plateNumber",
  "plate": "plateNumber", "numar": "plateNumber",
  "truck": "plateNumber", "camion": "plateNumber",
  "nr. inmatriculare": "plateNumber",
  // Marca
  "marca": "brand", "brand": "brand",
  // Model
  "model": "model",
  // An
  "an": "year", "an fabricatie": "year", "year": "year",
  // Kilometraj
  "kilometraj": "mileage", "mileage": "mileage", "km": "mileage",
  // ITP
  "itp": "itpExpiry", "expirare itp": "itpExpiry",
  "itpexpiry": "itpExpiry", "itp expiry": "itpExpiry",
  // RCA
  "rca": "rcaExpiry", "expirare rca": "rcaExpiry",
  "rcaexpiry": "rcaExpiry", "rca expiry": "rcaExpiry",
  // Vigneta
  "vigneta": "vignetteExpiry", "vignette": "vignetteExpiry",
  "expirare vigneta": "vignetteExpiry", "vignetteexpiry": "vignetteExpiry",
  "vignette expiry": "vignetteExpiry",
};

export const TRUCK_STATUS_MAP: Record<string, Truck["status"]> = {
  "disponibil": "available", "available": "available",
  "in cursa": "on_trip", "on trip": "on_trip", "on_trip": "on_trip",
  "in service": "in_service", "in_service": "in_service",
};

export interface TruckParsedRow {
  mapped: Partial<Truck>;
  errors: string[];
  isDuplicate: boolean;
  rowIndex: number;
}

export function parseTruckRows(
  raw: Record<string, string>[],
  existing: Truck[],
  t: (k: string) => string,
): TruckParsedRow[] {
  return raw.map((row, i) => {
    const errors: string[] = [];
    const mapped: Partial<Truck> = {};

    for (const [col, val] of Object.entries(row)) {
      const key = TRUCK_COL_MAP[col.trim().toLowerCase()];
      if (key) (mapped as Record<string, unknown>)[key] = val.trim();
    }

    const plate = (mapped.plateNumber ?? "").toUpperCase();
    if (!plate || !PLATE_REGEX.test(plate)) errors.push(t("trucks.import.errorPlate"));
    else mapped.plateNumber = plate;

    if (!mapped.brand || String(mapped.brand).trim().length < 2) errors.push(t("trucks.import.errorBrand"));
    if (!mapped.model) errors.push(t("trucks.import.errorModel"));

    const year = Number(mapped.year);
    if (!mapped.year || isNaN(year) || year < 1990 || year > new Date().getFullYear())
      errors.push(t("trucks.import.errorYear"));
    else (mapped as Record<string, unknown>).year = year;

    const mileage = Number(mapped.mileage);
    if (mapped.mileage !== undefined && (isNaN(mileage) || mileage < 0))
      errors.push(t("trucks.import.errorMileage"));
    else if (mapped.mileage !== undefined) (mapped as Record<string, unknown>).mileage = mileage;

    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    if (!mapped.itpExpiry || !dateRe.test(mapped.itpExpiry)) errors.push(t("trucks.import.errorItp"));
    if (!mapped.rcaExpiry || !dateRe.test(mapped.rcaExpiry)) errors.push(t("trucks.import.errorRca"));
    if (!mapped.vignetteExpiry || !dateRe.test(mapped.vignetteExpiry)) errors.push(t("trucks.import.errorVignette"));

    // Mapeaza status
    if ((mapped as Record<string, unknown>).status) {
      const rawStatus = String((mapped as Record<string, unknown>).status).trim().toLowerCase();
      (mapped as Record<string, unknown>).status = TRUCK_STATUS_MAP[rawStatus] ?? "available";
    }

    const isDuplicate = existing.some(
      (e) => e.plateNumber.toLowerCase() === plate.toLowerCase(),
    );

    return { mapped, errors, isDuplicate, rowIndex: i + 1 };
  });
}
