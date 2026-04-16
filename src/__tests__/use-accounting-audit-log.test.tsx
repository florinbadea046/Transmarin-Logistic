// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useAccountingAuditLog,
  loadAccountingAuditLog,
  type AccountingAuditEntry,
} from "@/hooks/use-accounting-audit-log";
import { STORAGE_KEYS } from "@/data/mock-data";

describe("useAccountingAuditLog", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("logs entry with auto-generated id, timestamp, user", () => {
    const { result } = renderHook(() => useAccountingAuditLog());
    act(() => {
      result.current.log({
        action: "create",
        entity: "invoice",
        entityId: "inv1",
        entityLabel: "FACT-001",
      });
    });
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.accounting_audit_log)!) as AccountingAuditEntry[];
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toContain("accounting-audit");
    expect(stored[0].user).toBe("Admin");
  });

  it("supports all entity types (invoice, supplier, payment, budget, recurringExpense)", () => {
    const { result } = renderHook(() => useAccountingAuditLog());
    const entities: AccountingAuditEntry["entity"][] = ["invoice", "supplier", "payment", "budget", "recurringExpense"];
    entities.forEach((entity, i) => {
      act(() => {
        result.current.log({ action: "create", entity, entityId: `id-${i}`, entityLabel: entity });
      });
    });
    expect(loadAccountingAuditLog()).toHaveLength(entities.length);
  });

  it("supports 'pay' action specifically for payments", () => {
    const { result } = renderHook(() => useAccountingAuditLog());
    act(() => {
      result.current.log({ action: "pay", entity: "payment", entityId: "p1", entityLabel: "Payment 1" });
    });
    expect(loadAccountingAuditLog()[0].action).toBe("pay");
  });

  it("prepends new entries (newest first)", () => {
    const { result } = renderHook(() => useAccountingAuditLog());
    act(() => {
      result.current.log({ action: "create", entity: "invoice", entityId: "i1", entityLabel: "First" });
    });
    act(() => {
      result.current.log({ action: "update", entity: "invoice", entityId: "i1", entityLabel: "Second" });
    });
    expect(loadAccountingAuditLog()[0].entityLabel).toBe("Second");
  });

  it("uses authenticated user from localStorage", () => {
    localStorage.setItem("transmarin_auth_user", JSON.stringify({ name: "Contabil Senior" }));
    const { result } = renderHook(() => useAccountingAuditLog());
    act(() => {
      result.current.log({ action: "create", entity: "invoice", entityId: "i1", entityLabel: "x" });
    });
    expect(loadAccountingAuditLog()[0].user).toBe("Contabil Senior");
  });

  it("preserves oldValue/newValue diffs", () => {
    const { result } = renderHook(() => useAccountingAuditLog());
    act(() => {
      result.current.log({
        action: "update",
        entity: "invoice",
        entityId: "i1",
        entityLabel: "FACT-001",
        oldValue: { status: "draft" },
        newValue: { status: "paid" },
      });
    });
    const e = loadAccountingAuditLog()[0];
    expect(e.oldValue).toEqual({ status: "draft" });
    expect(e.newValue).toEqual({ status: "paid" });
  });

  it("loadAccountingAuditLog returns empty when storage missing", () => {
    expect(loadAccountingAuditLog()).toEqual([]);
  });

  it("loadAccountingAuditLog handles malformed JSON", () => {
    localStorage.setItem(STORAGE_KEYS.accounting_audit_log, "not-json");
    expect(loadAccountingAuditLog()).toEqual([]);
  });
});
