// ──────────────────────────────────────────────────────────
// Formatare numere, date, valută — funcții comune
// ──────────────────────────────────────────────────────────

import { format, parseISO } from "date-fns";
import { ro } from "date-fns/locale";

/** Formatează o dată ISO la format românesc: "21 feb. 2026" */
export function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "d MMM yyyy", { locale: ro });
  } catch {
    return dateStr;
  }
}

/** Formatează o dată ISO cu oră: "21 feb. 2026, 14:30" */
export function formatDateTime(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "d MMM yyyy, HH:mm", { locale: ro });
  } catch {
    return dateStr;
  }
}

/** Formatează un număr ca valută RON: "1.234,56 RON" */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: "RON",
    minimumFractionDigits: 2,
  }).format(amount);
}

/** Formatează un număr cu separator de mii: "1.234" */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat("ro-RO").format(n);
}

/** Formatează km: "1.234 km" */
export function formatKm(km: number): string {
  return `${formatNumber(km)} km`;
}
