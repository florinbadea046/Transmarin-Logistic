// Sursă unificată de facturi pentru modulele care le agregă (Jurnale, Notificări).
//
// Istoric: in proiect exista doua chei in localStorage cu scheme diferite:
//   - `transmarin_invoices` — schema Invoice (EN) populata de seed-urile mock
//   - `invoices` — schema locala a paginii Facturi (RO: nr/tip/data/scadenta/linii)
//
// Facturile create de utilizator în pagina Facturi sunt scrise în cheia legacy.
// Pentru a evita o rescriere a paginii Facturi (UI complex cu form RHF, import,
// export), acest adapter e punctul oficial de integrare: toti consumatorii noi
// (Jurnale Contabile, Notificari Contabilitate, eventuale rapoarte) folosesc
// `getUnifiedInvoices()` si vad o lista normalizata in schema Invoice canonica.
//
// Adaugarea unui consumator nou: import `getUnifiedInvoices` din acest modul.
// Scrierea de facturi noi din afara paginii Facturi: foloseste `STORAGE_KEYS.invoices`
// direct (schema Invoice canonica) — adapter-ul le combina cu cele legacy la citire.

import { useMemo } from "react";
import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Invoice } from "@/modules/accounting/types";
import type { Invoice as LegacyInvoice } from "@/modules/accounting/pages/_components/invoices-types";
import { calcLineTotals } from "@/modules/accounting/pages/_components/invoices-utils";
import { useSyncedCollection } from "@/hooks/use-synced-collection";

/** Cheia localStorage pentru schema legacy (Facturi page). Nu o folosi direct
 *  decat in pagina Facturi; consumatorii noi merg prin `getUnifiedInvoices()`. */
export const LEGACY_INVOICES_STORAGE_KEY = "invoices";

function adaptStatus(legacy: LegacyInvoice): Invoice["status"] {
  if (legacy.status === "plătită") return "paid";
  if (legacy.status === "anulată") return "draft";
  const due = new Date(`${legacy.scadenta}T00:00:00`);
  const isOverdue = !isNaN(due.getTime()) && due.getTime() < Date.now();
  return isOverdue ? "overdue" : "sent";
}

function adaptLegacyInvoice(legacy: LegacyInvoice): Invoice {
  const { totalFaraTVA, tva, total } = calcLineTotals(legacy.linii);
  return {
    id: legacy.id,
    type: legacy.tip === "venit" ? "income" : "expense",
    number: legacy.nr,
    date: legacy.data,
    dueDate: legacy.scadenta,
    clientName: legacy.clientFurnizor,
    items: legacy.linii.map((l) => ({
      description: l.descriere,
      quantity: l.cantitate,
      unitPrice: l.pretUnitar,
      total: l.cantitate * l.pretUnitar,
    })),
    totalWithoutVAT: totalFaraTVA,
    vat: tva,
    total,
    status: adaptStatus(legacy),
  };
}

/** Identifică facturi "active" — ignoră cele anulate care nu sunt relevante pentru jurnale/notificări. */
function isActiveLegacy(legacy: LegacyInvoice): boolean {
  return legacy.status !== "anulată";
}

function mergeInvoices(canonical: Invoice[], legacy: LegacyInvoice[]): Invoice[] {
  const byId = new Map<string, Invoice>();
  for (const inv of canonical) byId.set(inv.id, inv);
  for (const l of legacy) {
    if (!isActiveLegacy(l)) continue;
    byId.set(l.id, adaptLegacyInvoice(l));
  }
  return Array.from(byId.values());
}

/** Union stabil: datele introduse de utilizator (schema RO) primează peste mock seed-uri.
 *  Versiunea non-reactiva: o singura citire sincrona. */
export function getUnifiedInvoices(): Invoice[] {
  return mergeInvoices(
    getCollection<Invoice>(STORAGE_KEYS.invoices),
    getCollection<LegacyInvoice>(LEGACY_INVOICES_STORAGE_KEY),
  );
}

/** Variantă reactivă: se reactualizează automat la orice schimbare in cele doua
 *  colectii (cross-tab sau intra-tab). */
export function useUnifiedInvoices(): Invoice[] {
  const { items: canonical } = useSyncedCollection<Invoice>(STORAGE_KEYS.invoices);
  const { items: legacy } = useSyncedCollection<LegacyInvoice>(LEGACY_INVOICES_STORAGE_KEY);
  return useMemo(() => mergeInvoices(canonical, legacy), [canonical, legacy]);
}
