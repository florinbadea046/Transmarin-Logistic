import type { Driver } from "@/modules/transport/types";

// ── Import Soferi ──────────────────────────────────────────

export const PHONE_RO_REGEX = /^07[0-9]{8}$/;

// Mapeaza orice header posibil (RO/EN, tradus sau nu) la cheia interna
export const DRIVER_COL_MAP: Record<string, string> = {
  // Nume
  "nume": "name", "name": "name",
  // Telefon
  "telefon": "phone", "phone": "phone",
  // Expirare permis - toate variantele posibile
  "exp. permis": "licenseExpiry",
  "expirare permis": "licenseExpiry",
  "data expirare permis": "licenseExpiry",
  "licenseexpiry": "licenseExpiry",
  "license expiry": "licenseExpiry",
  "lic. expiry": "licenseExpiry",
  "permis": "licenseExpiry",
  // Status
  "status": "status",
  // Camion (ignorat la import, doar info)
  "camion": "truckPlate",
  "truck": "truckPlate",
};

// Normalizeaza data din orice format la yyyy-MM-dd
export function normalizeDate(val: string): string {
  const v = val.trim();
  // deja corect
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  // dd/MM/yyyy sau dd.MM.yyyy
  const dmySlash = v.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/);
  if (dmySlash) return `${dmySlash[3]}-${dmySlash[2].padStart(2, "0")}-${dmySlash[1].padStart(2, "0")}`;
  // MM/dd/yyyy
  const mdySlash = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdySlash) return `${mdySlash[3]}-${mdySlash[1].padStart(2, "0")}-${mdySlash[2].padStart(2, "0")}`;
  return v;
}

export interface DriverParsedRow {
  mapped: Partial<Driver> & { truckPlate?: string };
  errors: string[];
  isDuplicate: boolean;
  rowIndex: number;
}

export function parseDriverRows(
  raw: Record<string, string>[],
  existing: Driver[],
  t: (k: string) => string,
): DriverParsedRow[] {
  return raw.map((row, i) => {
    const errors: string[] = [];
    const mapped: Partial<Driver> & { truckPlate?: string } = {};

    for (const [col, val] of Object.entries(row)) {
      const key = DRIVER_COL_MAP[col.trim().toLowerCase()];
      if (key) (mapped as Record<string, unknown>)[key] = val.trim();
    }

    if (!mapped.name || mapped.name.trim().length < 3)
      errors.push(t("drivers.import.errorName"));

    if (!mapped.phone || !PHONE_RO_REGEX.test(mapped.phone.trim()))
      errors.push(t("drivers.import.errorPhone"));

    if (mapped.licenseExpiry) {
      mapped.licenseExpiry = normalizeDate(mapped.licenseExpiry);
    }
    if (!mapped.licenseExpiry || !/^\d{4}-\d{2}-\d{2}$/.test(mapped.licenseExpiry))
      errors.push(t("drivers.import.errorDate"));

    // Mapeaza status tradus -> cheie interna
    const STATUS_MAP: Record<string, Driver["status"]> = {
      "disponibil": "available", "available": "available",
      "in cursa": "on_trip", "on trip": "on_trip", "on_trip": "on_trip",
      "liber": "off_duty", "off duty": "off_duty", "off_duty": "off_duty",
    };
    if (mapped.status) {
      const normalized = mapped.status.trim().toLowerCase();
      mapped.status = STATUS_MAP[normalized] ?? "available";
    } else {
      mapped.status = "available";
    }

    const isDuplicate = existing.some(
      (e) =>
        e.name.toLowerCase() === (mapped.name ?? "").toLowerCase() ||
        e.phone === (mapped.phone ?? ""),
    );

    return { mapped, errors, isDuplicate, rowIndex: i + 1 };
  });
}
