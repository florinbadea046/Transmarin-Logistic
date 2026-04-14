// ──────────────────────────────────────────────────────────
// useHrAuditLog — hook pentru inregistrarea actiunilor CRUD HR
// Persista in localStorage la STORAGE_KEYS.hr_audit_log
// ──────────────────────────────────────────────────────────

import { STORAGE_KEYS } from "@/data/mock-data";

export type HrAuditAction = "create" | "update" | "delete" | "approve" | "reject";
export type HrAuditEntity = "employee" | "leave" | "bonus" | "document" | "attendance" | "evaluation" | "training" | "candidate";

export interface HrAuditEntry {
  id: string;
  timestamp: string;
  user: string;
  action: HrAuditAction;
  entity: HrAuditEntity;
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

function loadLog(): HrAuditEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.hr_audit_log);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLog(entries: HrAuditEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.hr_audit_log, JSON.stringify(entries.slice(0, 500)));
  } catch {
    // quota exceeded — ignoram silentios
  }
}

export function useHrAuditLog() {
  const log = (entry: Omit<HrAuditEntry, "id" | "timestamp" | "user">) => {
    const entries = loadLog();
    const newEntry: HrAuditEntry = {
      ...entry,
      id: `hr-audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      user: getAuthUser(),
    };
    saveLog([newEntry, ...entries]);
  };

  return { log };
}

export { loadLog as loadHrAuditLog };
