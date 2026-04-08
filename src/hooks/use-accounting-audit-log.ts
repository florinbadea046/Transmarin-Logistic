// ──────────────────────────────────────────────────────────
// useAccountingAuditLog — hook pentru inregistrarea actiunilor CRUD Contabilitate
// Persista in localStorage la STORAGE_KEYS.accounting_audit_log
// ──────────────────────────────────────────────────────────

import { STORAGE_KEYS } from "@/data/mock-data";

export type AccountingAuditAction = "create" | "update" | "delete" | "pay";
export type AccountingAuditEntity = "invoice" | "supplier" | "payment" | "budget" | "recurringExpense";

export interface AccountingAuditEntry {
  id: string;
  timestamp: string;
  user: string;
  action: AccountingAuditAction;
  entity: AccountingAuditEntity;
  entityId: string;
  entityLabel: string;
  details?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
}

function getAuthUser(): string {
  try {
    const raw = localStorage.getItem("transmarin_auth_user");
    if (!raw) return "Admin";
    const parsed = JSON.parse(raw);
    return parsed.name ?? parsed.email ?? "Admin";
  } catch {
    return "Admin";
  }
}

function loadLog(): AccountingAuditEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.accounting_audit_log);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLog(entries: AccountingAuditEntry[]): void {
  try {
    localStorage.setItem(
      STORAGE_KEYS.accounting_audit_log,
      JSON.stringify(entries.slice(0, 500)),
    );
  } catch {
    // quota exceeded — ignoram silentios
  }
}

export function useAccountingAuditLog() {
  const log = (entry: Omit<AccountingAuditEntry, "id" | "timestamp" | "user">) => {
    const entries = loadLog();
    const newEntry: AccountingAuditEntry = {
      ...entry,
      id: `accounting-audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      user: getAuthUser(),
    };
    saveLog([newEntry, ...entries]);
  };

  return { log };
}

export { loadLog as loadAccountingAuditLog };
