// Sursă unificată de facturi pentru modulele care le agregă (Jurnale, Notificări).
// Codul istoric folosește două chei în localStorage cu scheme diferite:
//   - `transmarin_invoices` — schema Invoice (EN) populată de seed-urile mock
//   - `invoices` — schema locală Facturi (RO: nr/tip/data/scadenta/linii)
// Acest adapter normalizează totul la schema Invoice și elimină duplicatele.

import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Invoice } from "@/modules/accounting/types";
import type { Invoice as LegacyInvoice } from "@/modules/accounting/pages/_components/invoices-types";
import { calcLineTotals } from "@/modules/accounting/pages/_components/invoices-utils";

const LEGACY_STORAGE_KEY = "invoices";

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

/** Union stabil: datele introduse de utilizator (schema RO) primează peste mock seed-uri. */
export function getUnifiedInvoices(): Invoice[] {
  const byId = new Map<string, Invoice>();

  for (const inv of getCollection<Invoice>(STORAGE_KEYS.invoices)) {
    byId.set(inv.id, inv);
  }

  for (const legacy of getCollection<LegacyInvoice>(LEGACY_STORAGE_KEY)) {
    if (!isActiveLegacy(legacy)) continue;
    byId.set(legacy.id, adaptLegacyInvoice(legacy));
  }

  return Array.from(byId.values());
}
