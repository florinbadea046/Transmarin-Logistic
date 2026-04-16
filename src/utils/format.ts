// ──────────────────────────────────────────────────────────
// Formatare numere, date, valută — funcții comune
// ──────────────────────────────────────────────────────────

import { format, parseISO } from "date-fns";
import type { Locale } from "date-fns";
import { enUS, ro } from "date-fns/locale";
import i18next from "i18next";

/** Returnează locale-ul date-fns corespunzător limbii active din i18n.
 *  Importă `i18next` direct (nu `@/i18n`) pentru a evita încărcarea tranzitivă
 *  a `react-i18next` în teste care mock-uiesc doar anumite exporturi. */
export function getDateLocale(): Locale {
  return i18next.language?.startsWith("en") ? enUS : ro;
}

/** Formatează o dată ISO conform limbii active (ex: "21 feb. 2026" / "Feb 21, 2026"). */
export function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "PP", { locale: getDateLocale() });
  } catch {
    return dateStr;
  }
}

/** Formatează o dată ISO cu oră conform limbii active. */
export function formatDateTime(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "PP, HH:mm", { locale: getDateLocale() });
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
