import type { Client, Invoice } from "@/modules/accounting/types";
import type { Order } from "@/modules/transport/types";
import { STORAGE_KEYS } from "@/data/mock-data";
import {
  getCollection,
  setCollection,
  addItem,
  generateId,
} from "@/utils/local-storage";

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Auto-seed clients collection from existing Order.clientName and Invoice.clientName
 * strings. Runs once — idempotent. Creates a Client entry for each unique name
 * that doesn't already exist.
 */
export function ensureClientsSeeded(): Client[] {
  const clients = getCollection<Client>(STORAGE_KEYS.clients);
  const existingNames = new Set(clients.map((c) => normalizeName(c.name)));

  const orders = getCollection<Order>(STORAGE_KEYS.orders);
  const invoices = getCollection<Invoice>(STORAGE_KEYS.invoices);

  const allNames = new Set<string>();
  for (const o of orders) if (o.clientName) allNames.add(o.clientName.trim());
  for (const i of invoices) if (i.clientName) allNames.add(i.clientName.trim());

  const newClients: Client[] = [];
  for (const name of allNames) {
    if (!existingNames.has(normalizeName(name))) {
      newClients.push({
        id: generateId(),
        name,
        createdAt: new Date().toISOString(),
      });
    }
  }

  if (newClients.length > 0) {
    setCollection(STORAGE_KEYS.clients, [...clients, ...newClients]);
  }

  return getCollection<Client>(STORAGE_KEYS.clients);
}

/**
 * Resolve a displayable client name. Prefers clientId lookup, falls back to
 * legacy clientName string. Use this in tables/detail views so renames on the
 * Client entity propagate automatically.
 */
export function resolveClientName(
  record: { clientId?: string; clientName?: string },
  clients?: Client[],
): string {
  if (record.clientId) {
    const list = clients ?? getCollection<Client>(STORAGE_KEYS.clients);
    const found = list.find((c) => c.id === record.clientId);
    if (found) return found.name;
  }
  return record.clientName ?? "";
}

/**
 * Get or create a client by name. Returns the id. Used when user types a free
 * text client name (e.g. in order form) — ensures Client record exists and
 * returns the id so the caller can store it on the Order/Invoice.
 */
export function getOrCreateClientId(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "";
  const clients = getCollection<Client>(STORAGE_KEYS.clients);
  const key = normalizeName(trimmed);
  const existing = clients.find((c) => normalizeName(c.name) === key);
  if (existing) return existing.id;

  const id = generateId();
  addItem<Client>(STORAGE_KEYS.clients, {
    id,
    name: trimmed,
    createdAt: new Date().toISOString(),
  });
  return id;
}
