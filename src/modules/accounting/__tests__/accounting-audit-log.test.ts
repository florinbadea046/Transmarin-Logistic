// ──────────────────────────────────────────────────────────
// Unit tests: Accounting audit log hook
// File: src/hooks/use-audit-log.ts
// ──────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, vi } from "vitest";
import { useAuditLog, loadAuditLog } from "@/hooks/use-audit-log";

// Mock STORAGE_KEYS
vi.mock("@/data/mock-data", () => ({
  STORAGE_KEYS: {
    auditLog: "transmarin_audit_log",
  },
}));

describe("accounting-audit-log", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("logAccounting: salveaza o intrare in localStorage", () => {
    const { log } = useAuditLog();

    log({
      action: "create",
      entity: "invoice",
      entityId: "inv-1",
      entityLabel: "Factura FACT-2024-001",
    });

    const entries = loadAuditLog();
    expect(entries).toHaveLength(1);
    expect(entries[0].entity).toBe("invoice");
    expect(entries[0].action).toBe("create");
    expect(entries[0].entityId).toBe("inv-1");
  });

  it("logAccounting: intrarea contine timestamp valid ISO", () => {
    const { log } = useAuditLog();

    log({
      action: "update",
      entity: "supplier",
      entityId: "s-1",
      entityLabel: "Auto Parts SRL",
    });

    const entries = loadAuditLog();
    expect(entries[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it("logAccounting: intrarea contine id unic", () => {
    const { log } = useAuditLog();

    log({ action: "create", entity: "invoice", entityId: "inv-1", entityLabel: "F1" });
    log({ action: "create", entity: "invoice", entityId: "inv-2", entityLabel: "F2" });

    const entries = loadAuditLog();
    expect(entries[0].id).not.toBe(entries[1].id);
  });

  it("loadAccountingAuditLog: returneaza intrarile in ordine cronologica inversa", () => {
    const { log } = useAuditLog();

    log({ action: "create", entity: "invoice", entityId: "inv-1", entityLabel: "Prima" });
    log({ action: "update", entity: "invoice", entityId: "inv-2", entityLabel: "A doua" });

    const entries = loadAuditLog();
    // Prima intrare in array e cea mai recenta
    expect(entries[0].entityLabel).toBe("A doua");
    expect(entries[1].entityLabel).toBe("Prima");
  });

  it("Entry format: entity type factura (invoice) este valid", () => {
    const { log } = useAuditLog();

    log({ action: "delete", entity: "invoice", entityId: "inv-3", entityLabel: "Factura stearsa" });

    const entries = loadAuditLog();
    expect(entries[0].entity).toBe("invoice");
    expect(["create", "update", "delete"]).toContain(entries[0].action);
  });

  it("Entry format: entity type furnizor (supplier) este valid", () => {
    const { log } = useAuditLog();

    log({ action: "create", entity: "supplier", entityId: "s-5", entityLabel: "Furnizor Nou SRL" });

    const entries = loadAuditLog();
    expect(entries[0].entity).toBe("supplier");
  });

  it("logAccounting: pastreaza maxim 500 intrari", () => {
    const { log } = useAuditLog();

    for (let i = 0; i < 510; i++) {
      log({ action: "create", entity: "invoice", entityId: `inv-${i}`, entityLabel: `F${i}` });
    }

    const entries = loadAuditLog();
    expect(entries.length).toBeLessThanOrEqual(500);
  });

  it("logAccounting: salveaza oldValue si newValue optional", () => {
    const { log } = useAuditLog();

    log({
      action: "update",
      entity: "invoice",
      entityId: "inv-1",
      entityLabel: "Factura 1",
      oldValue: { status: "neplatita" },
      newValue: { status: "platita" },
    });

    const entries = loadAuditLog();
    expect(entries[0].oldValue).toEqual({ status: "neplatita" });
    expect(entries[0].newValue).toEqual({ status: "platita" });
  });
});