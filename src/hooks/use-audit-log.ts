// ──────────────────────────────────────────────────────────
// useAuditLog — hook pentru inregistrarea actiunilor CRUD
// Persista in localStorage la STORAGE_KEYS.auditLog
// ──────────────────────────────────────────────────────────

import { STORAGE_KEYS } from "@/data/mock-data";

export type AuditAction = "create" | "update" | "delete";
export type AuditEntity = "driver" | "truck" | "order" | "trip";

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  entityLabel: string;
  // Cheie i18n + parametri — tradusi la afisare, nu la salvare
  detailKey?: string;
  detailParams?: Record<string, string>;
  // Pastram details pentru compatibilitate cu intrari vechi
  details?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
}

function loadLog(): AuditEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.auditLog);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLog(entries: AuditEntry[]): void {
  // Pastram maxim 500 intrari pentru a nu umple localStorage
  const trimmed = entries.slice(0, 500);
  localStorage.setItem(STORAGE_KEYS.auditLog, JSON.stringify(trimmed));
}

export function useAuditLog() {
  const log = (entry: Omit<AuditEntry, "id" | "timestamp">) => {
    const entries = loadLog();
    const newEntry: AuditEntry = {
      ...entry,
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    saveLog([newEntry, ...entries]);
  };

  return { log };
}

export { loadLog as loadAuditLog };